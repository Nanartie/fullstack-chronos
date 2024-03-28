import React, { useEffect, useState } from "react";
import axios from "axios";
import IconButton from "@mui/material/IconButton";
import SettingsIcon from "@mui/icons-material/Settings";
import { CirclePicker } from "react-color";
import { StyledNavLink } from "./Sidebar.styles";
import { useParams, useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import {
  Typography,
  Button,
  Paper,
  TextField,
  Box,
  Popover,
  ListItem,
  List,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import CalendarOptionsMenu from "./CalendarOptionsMenu";
import CalendarsCreate from "./CalendarsCreate";
import { useCalendar } from "./CalendarContext";

function Sidebar() {
  const [users, setUsers] = useState([]);
  const { userId, calendarId } = useParams();
  const [anchorEl, setAnchorEl] = useState(null);
  const [isCreatingCalendar, setIsCreatingCalendar] = useState(false);
  const jwtToken = localStorage.getItem("jwtToken");
  const currentUserId = jwtToken != null ? jwtDecode(jwtToken).userId : 0;

  const { calendars, setCalendars } = useCalendar();
  const [selectedCalendar, setSelectedCalendar] = useState(null);

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  const handleCreateCalendar = () => {
    setIsCreatingCalendar(true);
  };

  const handleCancelCreateCalendar = () => {
    setIsCreatingCalendar(false);
  };

  const fetchCalendars = async () => {
    try {
      const response = await axios.get(`http://localhost:3000/api/calendars`, {
        headers: {
          authorization: `Bearer ${jwtToken}`,
        },
      });
      const calendarData = response.data[0];
      const sortedCalendars = calendarData.sort((a, b) => {
        if (a.name === "Personal") return -1;
        if (b.name === "Personal") return 1;
        return 0;
      });
      setCalendars(calendarData);
    } catch (error) {
      console.error("Error while receiving calendars:", error);
    }
  };


  const fetchUsers = async () => {
    try {
      const response = await axios.get(`http://localhost:3000/api/users`);
      const usersList = response.data;
      setUsers(usersList);
    } catch (error) {
      console.error("Error while receiving users:", error);
    }
  };
  
  useEffect(() => {
    fetchCalendars();
    fetchUsers();
  }, []);

  function getTextColor(backgroundColor) {
    if (!backgroundColor) backgroundColor = "#fffff";
    let r, g, b;
    if (backgroundColor.length === 4) {
      r = parseInt(backgroundColor[1] + backgroundColor[1], 16);
      g = parseInt(backgroundColor[2] + backgroundColor[2], 16);
      b = parseInt(backgroundColor[3] + backgroundColor[3], 16);
    } else {
      r = parseInt(backgroundColor.slice(1, 3), 16);
      g = parseInt(backgroundColor.slice(3, 5), 16);
      b = parseInt(backgroundColor.slice(5, 7), 16);
    }
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 125 ? "#000000" : "#FFFFFF";
  }

  function isActiveCalendar(calendarN) {
    if (calendarId) {
      if (calendarN === parseInt(calendarId, 10)) {
        return true;
      }
    }
    return false;
  }

  const handleClick = (event, calendar) => {
    event.preventDefault();
    setAnchorEl(event.currentTarget);
    setSelectedCalendar(calendar);
  };

  return (
    <Paper
      elevation={3}
      style={{ width: "14%", padding: 20, height: "100%", position: "fixed" }}
    >
      <Typography variant="h6" gutterBottom>
        My calendars
      </Typography>
      <List>
        {calendars.map((calendar) => (
          <StyledNavLink key={calendar.id} to={`/mycalendar/${calendar.id}`}>
            <ListItem
              button
              style={{
                backgroundColor: calendar.color,
                borderRadius: "10px",
                color: getTextColor(calendar.color),
                border: isActiveCalendar(calendar.id)
                  ? "3px solid black"
                  : "3px solid white",
              }}
            >
              <ListItemText primary={calendar.name} />
                <IconButton
                  onClick={(event) => handleClick(event, calendar)}
                  style={{ color: getTextColor(calendar.color) }}
                >
                  <SettingsIcon />
                </IconButton>
            </ListItem>
          </StyledNavLink>
        ))}
      </List>
      <Box>
        <CalendarOptionsMenu
          id={id}
          open={open}
          anchorEl={anchorEl}
          handleClose={handleClose}
          selectedCalendar={selectedCalendar}
          update={fetchCalendars}
          users={users}
          currentUserId={currentUserId}
        />
      </Box>

      {jwtToken && (
        <Button
          variant="outlined"
          style={{
            position: "fixed",
            bottom: "110px",
            left: "calc(7% + 20px)",
            transform: "translateX(-50%)",
          }}
          onClick={handleCreateCalendar}
        >
          Create calendar
        </Button>
      )}
      <CalendarsCreate
        open={isCreatingCalendar}
        close={handleCancelCreateCalendar}
        update={fetchCalendars}
      />
    </Paper>
  );
}

export default Sidebar;
