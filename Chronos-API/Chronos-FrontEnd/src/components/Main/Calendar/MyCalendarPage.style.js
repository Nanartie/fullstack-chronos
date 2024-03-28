import { styled } from "@mui/material/styles";
import TableCell from "@mui/material/TableCell";


export const Tablecell = styled(TableCell)(({ current, selected, holiday, weekend, event }) => ({
  height: "60px",
  width: "60px",
  textAlign: "center",
  verticalAlign: "middle",
  backgroundColor: current ? "#5282de" : "inherit",
  color: holiday ? "#FF0000" : (weekend ? "#FF0000" : "inherit"),
  borderColor: selected ? "#5282de" : "",
  cursor: "pointer",
}));
