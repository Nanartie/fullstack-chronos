import React, { useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { CirclePicker } from "react-color";

function CalendarsCreate(props) {
    const { userId } = useParams();
    const jwtToken = localStorage.getItem("jwtToken");
    const [newCalendarData, setNewCalendarData] = useState({
      title: "",
      content: "",
      color: "#ffffff"
    });

    const { open, close, update } = props;

    const navigate = useNavigate();

    const handleNewCalendarChange = (e) => {
      const { name, value } = e.target;
      setNewCalendarData({
        ...newCalendarData,
        [name]: value,
      });
    };
    
    const handleColorChange = (color) => {
      setNewCalendarData({
        ...newCalendarData,
        color: color.hex,
      });
    };

    const handleCreateNewCalendar = async () => {
      const requiredFields = ["title"];
    
      for (const field of requiredFields) {
        if (!newCalendarData[field]) {
          alert(`Field ${field} is required`);
          return;
        }
      }
    
      if (newCalendarData["title"] === "Personal") {
        alert('Calendar name can not be "Personal"');
        return;
      }
    
      try {
        const calendarData = {
          title: newCalendarData.title,
          content: newCalendarData.content,
          color: newCalendarData.color,
        };
        console.log(calendarData);
        const response = await axios.post(
          `http://localhost:3000/api/${userId}/calendars`,
          calendarData,
          {
            headers: {
              Authorization: `Bearer ${jwtToken}`,
            },
          }
        );
    
        console.log("Event created:", response.data);
        setNewCalendarData({
          title: "",
          content: "",
          color: "#ffffff",
        });
    
        update();
        close();
      } catch (error) {
        console.error("Error while creating event:", error);
        if (error.response.status === 401) {
          localStorage.removeItem("jwtToken");
          navigate("/");
          alert("Token expired");
          window.location.reload();
        }
      }
    };

    return(
        <Dialog open={open} onClose={close}>
        <DialogTitle>Create New Calendar</DialogTitle>
        <DialogContent>
          <TextField
            label="Title"
            variant="outlined"
            fullWidth
            margin="normal"
            name="title"
            value={newCalendarData.title}
            onChange={handleNewCalendarChange}
            required
          />
          <TextField
            label="Content"
            variant="outlined"
            fullWidth
            margin="normal"
            name="content"
            value={newCalendarData.content}
            onChange={handleNewCalendarChange}
          />
          <div style={{ marginTop: '20px', marginLeft: '50%', transform: "translateX(-50%)" }}>
            <CirclePicker color={newCalendarData.color} onChange={handleColorChange} />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={close} color="primary">
            Cancel
          </Button>
          <Button onClick={handleCreateNewCalendar} color="primary">
            Create Calendar
          </Button>
        </DialogActions>
      </Dialog>
    );
}

export default CalendarsCreate;