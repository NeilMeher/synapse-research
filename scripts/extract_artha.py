"""Extract the declared ADB India national IOT vintage without executing workbook formulas."""
from datetime import date
from decimal import Decimal, InvalidOperation
from hashlib import sha256
import json
from pathlib import Path
import re
import sys
from xml.etree import ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "sources/artha-adb-india.json"
OUTPUT = ROOT / "data/processed/artha-india.json"
ALLOWANCE = Decimal("0.0001")
DOMESTIC_START = 8
IMPORT_START = 43
ROWS = 35


def read_source():
    source = json.loads(SOURCE.read_bytes())
    date.fromisoformat(source["retrievalDate"])
    if source["geography"] != "India, national" or source["units"] != "USD million at current prices":
        raise ValueError("Unexpected frozen geography or monetary denomination.")
    if not re.fullmatch(r"[0-9a-f]{64}",source["sha256"]):
        raise ValueError("Malformed frozen workbook digest.")
    return source


def excel(index):
    label = ""
    while index:
        index, offset = divmod(index-1,26)
        label = chr(ord("A")+offset)+label
    return label


def sheet_cells(workbook, name):
    strings = ["".join(x.itertext()) for x in ET.fromstring(workbook.read("xl/sharedStrings.xml"))]
    sheet = next(x for x in ET.fromstring(workbook.read("xl/workbook.xml")).findall(".//{*}sheet") if x.get("name")==name)
    relationship = next(v for k,v in sheet.attrib.items() if k.endswith("}id"))
    file = next(x.get("Target") for x in ET.fromstring(workbook.read("xl/_rels/workbook.xml.rels"))
                if x.get("Id")==relationship)
    if not re.fullmatch(r"worksheets/sheet[0-9]+\.xml",file):
        raise ValueError("Unexpected worksheet relationship.")
    values = {}
    for cell in ET.fromstring(workbook.read("xl/"+file)).findall(".//{*}sheetData/{*}row/{*}c"):
        raw = cell.findtext("{*}v")
        if raw is None:
            continue
        addr = cell.get("r")
        if addr in values:
            raise ValueError(f"Duplicate source cell {name}!{addr}")
        values[addr] = strings[int(raw)] if cell.get("t")=="s" else raw
    return values


def close(note,left,right):
    amount = abs(left-right)
    if amount > ALLOWANCE:
        raise ValueError(f"{note} exceeds source tolerance by difference {amount}")
    return amount


def extract_sheet(cells, year, source):
    if cells.get("A1")!=f"India Input-Output Table (35x35), {year}" or cells.get("A2")!="(at current prices, $ million)":
        raise ValueError("Unexpected worksheet identity or valuation units.")
    cols = [excel(i) for i in range(4,39)]
    final = ["AM","AN","AO","AP","AQ","AR"]
    if [cells.get(col+"7") for col in final]!=[f"F{i}" for i in range(1,7)]:
        raise ValueError("Unexpected final-demand classification.")
    accounts=[]
    for i,col in enumerate(cols):
        r=DOMESTIC_START+i
        code=f"c{i+1}"
        if (cells.get(f"B{r}"),cells.get(f"C{r}"),cells.get(f"B{r+35}"),cells.get(f"C{r+35}"),
            cells.get(col+"6"),cells.get(col+"7")) != ("IND",code,"IMP",code,"IND",code):
            raise ValueError("Source sector maps differ between domestic, import and buyer blocks.")
        name=cells[f"A{r}"]
        if name!=cells[col+"5"] or name!=cells[f"A{r+35}"]:
            raise ValueError("Source industry labels disagree.")
        accounts.append(dict(code=code,name=name,sourceRow=r,sourceColumn=col))
    labels={78:"M",79:"r60",80:"r99",81:"r61",82:"r62",83:"r63",84:"r64",85:"trs",86:"r69"}
    if any(cells.get("C"+str(r))!=label for r,label in labels.items()):
        raise ValueError("Source account rows changed location.")

    def number(col,r):
        address=f"{col}{r}"
        try:
            value=Decimal(cells[address])
        except (KeyError,InvalidOperation) as exc:
            raise ValueError(f"Missing or nonnumeric required cell {year}!{address}") from exc
        if not value.is_finite():
            raise ValueError(f"Nonfinite source value {year}!{address}")
        return value

    dom=[[number(col, DOMESTIC_START+i) for col in cols] for i in range(ROWS)]
    imp=[[number(col, IMPORT_START+i) for col in cols] for i in range(ROWS)]
    if any(value<0 for side in (dom,imp) for row in side for value in row):
        raise ValueError("Signed intermediate cells require a revised treatment.")
    output=[number("AS", DOMESTIC_START+i) for i in range(ROWS)]
    final_by_sector=[[number(col, DOMESTIC_START+i) for col in final] for i in range(ROWS)]
    demand=[sum(row) for row in final_by_sector]
    imports=[sum(row[j] for row in imp) for j in range(ROWS)]
    va=[number(col,84) for col in cols]
    adjustments=[sum(number(col,r) for r in (80,81,82,83,85)) for col in cols]
    residuals=[]
    for i,col in enumerate(cols):
        residuals.extend([
            close(f"{year} {col} published domestic output",output[i],number(col,86)),
            close(f"{year} {col} domestic row",output[i],sum(dom[i])+demand[i]),
            close(f"{year} {col} published import",imports[i],number(col,78)),
            close(f"{year} {col} intermediate inputs",sum(row[i] for row in dom)+imports[i],number(col,79)),
            close(f"{year} {col} industry cost",sum(row[i] for row in dom)+imports[i]+va[i]+adjustments[i],output[i]),
        ])
    residuals.append(close(f"{year} published value added",sum(va),number("AS",84)))
    exclude=34
    if any(x!=0 for x in [output[exclude],demand[exclude],imports[exclude],va[exclude],adjustments[exclude],
                         *dom[exclude],*(row[exclude] for row in dom)]):
        raise ValueError("Zero-output sector c35 has nonzero domestic flows.")
    if any(x<=0 for x in output[:exclude]):
        raise ValueError("Active domestic sector with zero or negative gross output.")
    return dict(sourceId=source["id"],year=year,units=source["units"],resolution="source",
                tolerance=float(ALLOWANCE),industries=accounts[:exclude],excluded=[accounts[exclude]],
                transactions=[[float(x) for x in row[:exclude]] for row in dom[:exclude]],
                **{k:[float(x) for x in v[:exclude]] for k,v in dict(output=output,finalDemand=demand,imports=imports,
                                                                  valueAdded=va,adjustments=adjustments).items()},
                published=dict(totalValueAdded=float(number("AS",84)),maximumExtractionResidual=float(max(residuals)),
                               domesticOutput=float(sum(output)),intermediateImports=float(sum(imports)),
                               finalDemandColumns=final))


def extract(path):
    source=read_source()
    payload=Path(path).read_bytes()
    if len(payload)!=source["fileBytes"] or sha256(payload).hexdigest()!=source["sha256"]:
        raise ValueError("Workbook does not match the frozen source manifest.")
    with ZipFile(path) as workbook:
        panels={str(year):extract_sheet(sheet_cells(workbook,str(year)),year,source) for year in source["referencePeriods"]}
    return dict(schemaVersion="artha-india-source-v1",source=source,panels=panels)


if __name__=="__main__":
    dataset=extract(sys.argv[1])
    canonical=json.dumps(dataset,ensure_ascii=False,indent=2,allow_nan=False)+"\n"
    if "--check" in sys.argv:
        if OUTPUT.read_bytes()!=canonical.encode("utf-8"):
            raise ValueError("Processed model data differs from source extraction.")
    else:
        OUTPUT.parent.mkdir(parents=True,exist_ok=True)
        with OUTPUT.open("x",encoding="utf-8",newline="\n") as out:
            out.write(canonical)
    for year,panel in dataset["panels"].items():
        print(year,panel["published"])
