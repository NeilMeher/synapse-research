"""Normalize the public CHRONOS transcription and audit original publisher files."""
import argparse
import csv
from decimal import Decimal
from hashlib import sha256
from html.parser import HTMLParser
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data/processed/chronos-rail.json"
REGIONS = ROOT / "data/chronos/selected-state-routes.csv"
SUMMARY = ROOT / "data/chronos/railboard-summary-transcription.csv"
MANIFEST = ROOT / "sources/chronos-rail.json"
STATES = ("Andhra Pradesh", "Bihar", "Gujarat", "Karnataka", "Maharashtra", "Telangana", "West Bengal")
BOARD = "railway-board-summary-2024-25"
RBI = "rbi-rail-route-2024-25"
FIELDS = ("route", "electric", "tonnes", "ntkm")
LOCATORS = ("Route kilometres / Total", "Route kilometres / Electrified",
            "Freight Traffic / Tonnes originating / Revenue earning",
            "Freight Traffic / Net tonne kms / Revenue earning")


class Rows(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.rows = []

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.stack.append([[], None])
        if tag in ("td", "th") and self.stack:
            self.stack[-1][1] = []

    def handle_data(self, text):
        if self.stack and self.stack[-1][1] is not None:
            self.stack[-1][1].append(text)

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.stack and self.stack[-1][1] is not None:
            row, cell = self.stack[-1]
            row.append(" ".join("".join(cell).split()))
            self.stack[-1][1] = None
        if tag == "tr" and self.stack:
            row, _ = self.stack.pop()
            if row:
                self.rows.append(row)


def source_rows(html):
    parser = Rows()
    parser.feed(html)
    years = None
    found = {}
    for row in parser.rows:
        if row[0] == "State/Union Territory":
            try:
                years = tuple(map(int, row[1:]))
            except ValueError:
                continue
        name = row[0].rstrip("@ ")
        if name not in (*STATES, "ALL INDIA") or years is None:
            continue
        if len(row) - 1 != len(years):
            raise ValueError(f"State/year alignment changed for {name}.")
        for year, value in zip(years, row[1:], strict=True):
            key = (name, year)
            if key in found:
                raise ValueError(f"Duplicate regional cell {key}.")
            if value in (".", "-"):
                found[key] = (None, "not applicable" if value=="." else "not available")
            elif re.fullmatch(r"\d{1,3}(?:,\d{3})*|\d+", value):
                found[key] = (int(value.replace(",", "")), "as published")
            else:
                raise ValueError(f"Unrecognized regional cell {key} {value!r}.")
    if not all((state, year) in found for state in (*STATES, "ALL INDIA") for year in range(2004,2025)):
        raise ValueError("Publisher regional table is incomplete or its schema changed.")
    return found


def regional_rows(values):
    for state in STATES:
        for year in range(2004,2025):
            value, note = values[state,year]
            yield state, year, "" if value is None else value, note


def period(fiscal):
    match = re.fullmatch(r"(\d{4})-(\d{2})", fiscal)
    if not match:
        raise ValueError(f"Malformed fiscal period {fiscal}.")
    y = int(match[1])
    if (y+1)%100 != int(match[2]):
        raise ValueError(f"Nonconsecutive fiscal period {fiscal}.")
    return dict(label=fiscal,start=f"{y}-04-01",end=f"{y+1}-03-31",endYear=y+1,complete=True)


def tables():
    rows=[]
    with SUMMARY.open(encoding="utf8",newline="") as f:
        for i,row in enumerate(csv.reader(f)):
            if i==0:
                if row!=["fiscal","route_km","electrified_route_km","revenue_originating_million_tonnes","revenue_net_tonne_km_million"]:
                    raise ValueError("Wrong route and freight measurement columns.")
                continue
            fiscal, route, electric, tonnes, ntkm = row
            p = period(fiscal)
            values = [int(route),int(electric),float(Decimal(tonnes)),float(Decimal(ntkm)/1000)]
            if (rows and p["endYear"]<=rows[-1]["period"]["endYear"]) or not all(0<x<200000 for x in values) or values[1]>values[0]:
                raise ValueError(f"Historical accounting failed for {fiscal}.")
            cells={}
            for key,value,locator in zip(FIELDS,values,LOCATORS,strict=True):
                coverage = "board-route-stock-as-published" if key in ("route","electric") else "board-revenue-freight-as-published"
                cells[key]=dict(id=f"{BOARD}:{fiscal}:{key}",source=BOARD,locator=f"PDF page 1 · {locator} · {fiscal}",
                                value=value,coverage=coverage,status="as published")
            rows.append(dict(period=p,cells=cells))
    if len(rows)!=17:
        raise ValueError("Unexpected number of primary columns.")
    return rows


def normalized():
    national=tables()
    regions=[]
    with REGIONS.open(encoding="utf8",newline="") as f:
        for row in csv.DictReader(f):
            name,year,status=row["state"],int(row["year"]),row["status"]
            value=int(row["route_km"]) if row["route_km"] else None
            if name not in STATES or not 2004<=year<=2024 or (value is None)!=(status!="as published") or value is not None and value<0:
                raise ValueError("Invalid regional source cell.")
            boundary="Undivided Andhra Pradesh includes Telangana" if name=="Andhra Pradesh" and year<2014 else "As published"
            if name in ("Andhra Pradesh","Telangana") and year==2014:
                boundary="RBI prints both rows for March 2014 while noting inclusion through 2013–14. Treat scope as ambiguous."
            if name=="Andhra Pradesh" and year==2015:
                boundary="First full reporting year after state division. Skip change from undivided geography."
            regions.append(dict(id=f"{RBI}:{name}:{year}",source=RBI,name=name,year=year,date=f"{year}-03-31",value=value,status=status,
                                boundary=boundary,locator=f"Table 145 · {name} · March {year}"))
    if len(regions)!=len(STATES)*21 or len({row["id"] for row in regions})!=len(regions):
        raise ValueError("Incomplete or duplicated regional table.")
    return dict(schemaVersion="chronos-rail-v1",sourceId="indian-railway-history-2026",national=national,regions=regions)


def manifest():
    data=json.loads(MANIFEST.read_bytes())
    if data["id"]!="indian-railway-history-2026" or not re.fullmatch(r"\d{4}-\d{2}-\d{2}",data["retrievalDate"]):
        raise ValueError("Invalid historical provenance register.")
    return data


def check_files(directory):
    for source in manifest()["sources"]:
        path=directory/source["localName"]
        body=path.read_bytes()
        if len(body)!=source["bytes"] or sha256(body).hexdigest()!=source["sha256"]:
            raise ValueError(f"Frozen publisher digest changed: {source['id']}")
    published=source_rows((directory/"rbi-2024-25.html").read_text(encoding="utf-8-sig"))
    for row in normalized()["regions"]:
        if (row["value"],row["status"])!=published[row["name"],row["year"]]:
            raise ValueError(f"State row mismatch {row['id']}")
    return published


NUM = re.compile(r"(?<![\w.])-?[\d,]+(?:\.\d+)?(?![\w.])")


def round_recency(a,b,d="0.5"):
    return abs(Decimal(str(a))-Decimal(str(b))) <= Decimal(d)


def source_cells(text,name,count):
    rows=[line.strip()[len(name):].strip() for line in text.splitlines() if line.strip().startswith(name)]
    if len(rows)!=1:
        raise ValueError(f"Source text row cannot be uniquely located: {name}")
    cells=[Decimal(v.replace(",","")) for v in NUM.findall(rows[0])]
    if len(cells)!=count:
        raise ValueError(f"Unexpected values on row {name}: {cells}")
    return cells


def source_check(directory):
    from pypdf import PdfReader

    state_source=check_files(directory)
    reports=tables()
    actual={row["period"]["endYear"]:row["cells"] for row in reports}
    report=PdfReader(directory/"railboard-report-2024-25.pdf").pages[18].extract_text(extraction_mode="layout")
    tonnes=source_cells(report,"Tonnes originating (million)",3)
    ntkm=source_cells(report,"Net tonne kms. (million)",3)
    for index,year in enumerate(range(2023,2026)):
        if Decimal(str(actual[year]["tonnes"]["value"]))!=tonnes[index] or Decimal(str(actual[year]["ntkm"]["value"]))*1000!=ntkm[index]:
            raise ValueError(f"Freight corroboration mismatch for {year}.")

    statement=PdfReader(directory/"railboard-statements-2024-25.pdf").pages[47].extract_text(extraction_mode="layout")
    spread=statement.splitlines()
    electric=next(re.split(r"\s{3,}",line.strip()) for line in spread if re.search(r"\(i\).*?@\s*Electrified",line))
    end=next(i for i,line in enumerate(spread) if "Total Elect. & Non-elect." in line)
    total=re.split(r"\s{3,}",spread[end-1].strip())
    if not round_recency(actual[2025]["electric"]["value"],electric[5].replace(",","")) or not round_recency(actual[2025]["route"]["value"],total[4].replace(",","")):
        raise ValueError("Statement 8 corroboration differs.")
    for year in range(2019,2025):
        if actual[year]["route"]["value"]!=state_source["ALL INDIA",year][0]:
            raise ValueError(f"Country total mismatch with RBI at {year}.")
    print("Source integrity verified. Statement 8 matched two rounded route stocks. The annual report matched six freight cells. RBI matched six recent national totals and all 147 regional cells.")

    early = [(year,actual[year]["route"]["value"]-state_source["ALL INDIA",year][0]) for year in (2016,2017,2018)]
    print("RBI early comparative national differences, Board minus RBI, route km:",early)

    # The content extracted below remains in the caller's local output only.
    for name in ("survey-2024-25.pdf","survey-2025-26.pdf"):
        page=PdfReader(directory/name).pages[60].extract_text(extraction_mode="layout")
        lines=page.splitlines()
        labels=re.findall(r"\b\d{4}-\d{2}\b","\n".join(lines[:10]))
        starts=sorted({int(label[:4]) for label in labels})
        if len(starts) not in (6,7):
            raise ValueError(f"Unexpected Survey year header {starts}")
        candidates=[line.strip()[len("Electrified"):].split() for line in lines if line.strip().startswith("Electrified")]
        if len(candidates)!=1 or len(candidates[0])!=len(starts):
            raise ValueError("Survey electrified row labels changed.")
        marked=[]
        for year, token in zip(starts[:-1],candidates[0][:-1],strict=True):
            val=Decimal(token)
            places=len(token.split(".")[1]) if "." in token else 0
            step=Decimal(1000)/10**places/2
            original=actual[year+1]["electric"]["value"]
            delta=original-val*1000
            if abs(delta)>step:
                marked.append((year+1,int(delta)))
        print(name, "local only · Board minus Survey route km beyond display precision",marked)


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--check",action="store_true")
    parser.add_argument("--create-regions",type=Path)
    parser.add_argument("--source-dir",type=Path)
    args=parser.parse_args()
    if args.create_regions:
        path=args.create_regions/"rbi-2024-25.html"
        expected=next(source["sha256"] for source in manifest()["sources"] if source["id"]==RBI)
        if sha256(path.read_bytes()).hexdigest()!=expected:
            raise ValueError("Unexpected RBI snapshot.")
        rows = list(regional_rows(source_rows(path.read_text(encoding="utf-8-sig"))))
        with REGIONS.open("x",encoding="utf8",newline="") as f:
            writer=csv.writer(f,lineterminator="\n")
            writer.writerow(["state","year","route_km","status"])
            writer.writerows(rows)
    payload=(json.dumps(normalized(),ensure_ascii=False,allow_nan=False,indent=2)+"\n").encode("utf8")
    if args.check:
        if payload!=OUTPUT.read_bytes():
            raise ValueError("Processed historical data differ from the recorded transformation.")
    else:
        with OUTPUT.open("xb") as f:
            f.write(payload)
    if args.source_dir:
        source_check(args.source_dir)
    print("CHRONOS: 17 national periods, 68 direct cells and 147 regional records.")


if __name__=="__main__":
    main()
