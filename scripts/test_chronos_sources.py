"""Check fiscal and official-source parsing rules on bounded fixtures."""
import unittest
from extract_chronos import STATES, normalized, period, round_recency, source_rows


def region_table(changed=False):
    blocks=[]
    for start,end in ((2004,2012),(2013,2024)):
        blocks.append("<tr><td>State/Union Territory</td>"+"".join(f"<td>{year}</td>" for year in range(start,end+1))+"</tr>")
        for name in (*STATES,"ALL INDIA"):
            label=name+"@" if name=="Andhra Pradesh" and start==2013 else name
            values=["." if name=="Telangana" and y<2014 else "-" if y==2020 else "1,245" for y in range(start,end+1)]
            if changed and name=="Bihar" and start==2013:
                values.pop()
            blocks.append(f"<tr><td>{label}</td>"+"".join(f"<td>{x}</td>" for x in values)+"</tr>")
    return "<table>"+"".join(blocks)+"</table>"


class SourceChecks(unittest.TestCase):
    def test_fiscal_year_and_display_precision(self):
        self.assertEqual(period("1999-00")["end"],"2000-03-31")
        with self.assertRaises(ValueError):
            period("2024-26")
        self.assertTrue(round_recency(65510,65510.37))
        self.assertFalse(round_recency(65510,68700,50))

    def test_geography_and_missing_representations(self):
        rows=source_rows(region_table())
        self.assertEqual(rows["Telangana",2013],(None,"not applicable"))
        self.assertEqual(rows["Telangana",2014],(1245,"as published"))
        self.assertEqual(rows["Maharashtra",2020],(None,"not available"))
        self.assertEqual(len(rows),168)
        with self.assertRaises(ValueError):
            source_rows(region_table(True))

    def test_published_rows_distinguish_units_and_boundary(self):
        data=normalized()
        self.assertEqual(len(data["national"]),17)
        self.assertEqual(data["national"][-1]["cells"]["ntkm"]["value"],971.085)
        transition=[x for x in data["regions"] if x["year"]==2014 and x["name"] in ("Andhra Pradesh","Telangana")]
        self.assertEqual(len(transition),2)
        self.assertTrue(all("ambiguous" in item["boundary"] for item in transition))


if __name__=="__main__":
    unittest.main()
