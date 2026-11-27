"""Check fail-closed parsing and accounting with an artificial workbook cell map."""
import unittest
from copy import deepcopy
from extract_artha import excel, extract_sheet, read_source


def fixture():
    cells = {"A1": "India Input-Output Table (35x35), 2024", "A2": "(at current prices, $ million)", "AS84": "340"}
    for i, column in enumerate(("AM", "AN", "AO", "AP", "AQ", "AR"), 1):
        cells[column + "7"] = f"F{i}"
    for i in range(35):
        r, col, code = i + 8, excel(i + 4), f"c{i+1}"
        n = str(10 if i < 34 else 0)
        cells.update({f"A{r}": code, f"B{r}": "IND", f"C{r}": code,
                      f"A{r+35}": code, f"B{r+35}": "IMP", f"C{r+35}": code,
                      col+"5": code, col+"6": "IND", col+"7": code,
                      f"AS{r}": n, f"AM{r}": n, col+"84": n, col+"86": n})
        for field in ("AN", "AO", "AP", "AQ", "AR"):
            cells[field+str(r)] = "0"
        for j in (*range(8, 80), 80, 81, 82, 83, 85):
            cells.setdefault(col+str(j), "0")
    for row, label in enumerate(("M","r60","r99","r61","r62","r63","r64","trs","r69"), 78):
        cells[f"C{row}"] = label
    return cells


class Extraction(unittest.TestCase):
    def setUp(self):
        self.source = read_source()
        self.cells = fixture()

    def test_complete_cell_map(self):
        panel = extract_sheet(self.cells, 2024, self.source)
        self.assertEqual(panel["published"]["domesticOutput"], 340)
        self.assertEqual(len(panel["transactions"]), 34)
        self.assertEqual(panel["excluded"][0]["code"], "c35")

    def test_units_classification_and_amounts(self):
        for cell, changed in (("A2", "thousand"), ("D7", "c2"), ("AM7", "F6"), ("D8", "nan"),
                              ("D78", "1"), ("AS8", "9"), ("D8", "-1")):
            with self.subTest(cell=cell, changed=changed):
                revised = deepcopy(self.cells)
                revised[cell] = changed
                with self.assertRaises(ValueError):
                    extract_sheet(revised, 2024, self.source)

    def test_blank_required_cell(self):
        del self.cells["D8"]
        with self.assertRaises(ValueError):
            extract_sheet(self.cells, 2024, self.source)


if __name__ == "__main__":
    unittest.main()
