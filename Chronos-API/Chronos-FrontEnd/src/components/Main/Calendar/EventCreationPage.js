import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";

import {
  Box,
  TextField,
  Typography,
  Button,
  Autocomplete,
} from "@mui/material";
import { CirclePicker } from "react-color";

function EventCreationPage() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const jwtToken = localStorage.getItem("jwtToken");
  const [newPostData, setNewPostData] = useState({
    title: "",
    content: "",
    startDate: dayjs(),
    endDate: dayjs(),
    date: dayjs(),
    type: "",
    calendars: [],
    files: "",
    color: "#ffffff",
    filenames: "",
  });

  const [events, setEvents] = useState([
    { title: "Arrangement" },
    { title: "Reminder" },
    { title: "Task" },
  ]);

  const [uploadPostFile, setUploadPostFile] = useState("");

  const handleFileUpload = (e) => {
    const files = e.target.files;
    setUploadPostFile(files);
  };

  const [selectedEvents, setSelectedEvents] = useState("");

  const [calendars, setCalendars] = useState([]);
  const [selectedCalendars, setSelectedCalendars] = useState([]);
  const [selectedEventType, setSelectedEventType] = useState(null);

  const handleEventTypeChange = (event, newValue) => {
    setSelectedEventType(newValue);
    setSelectedEvents(newValue);
  };
  
  useEffect(() => {
    async function fetchCalendars() {
      try {
        const response = await axios.get(
          "http://localhost:3000/api/calendars",
          {
            headers: {
              authorization: `Bearer ${jwtToken}`,
            },
          }
        );
        const calendarData = response.data[0];
        setCalendars(calendarData);
      } catch (error) {
        console.error("Error while receiving calendars:", error);
      }
    }

    fetchCalendars();
  }, []);

  const handleCalendarChange = (event, newValue) => {
    setSelectedCalendars(newValue);
  };

  const handleNewPostChange = (e) => {
    const { name, value } = e.target;
    setNewPostData({
      ...newPostData,
      [name]: value,
    });
  };

  const handleDateChange = (date) => {
    setNewPostData({
      ...newPostData,
      date: date,
    });
  };

  const handleStartDateChange = (startDate) => {
    setNewPostData({
      ...newPostData,
      startDate: startDate,
    });
  };

  const handleEndDateChange = (endDate) => {
    setNewPostData({
      ...newPostData,
      endDate: endDate,
    });
  };

  const handleCancel = () => {
    navigate(`/profile/${userId}`);
  };

  const handleColorChange = (color) => {
    setNewPostData({
      ...newPostData,
      color: color.hex,
    });
  };

  const handleCreateNewPost = async (event) => {
    event.preventDefault();
  
    const requiredFields = ["title", "content"];
  
    for (const field of requiredFields) {
      if (!newPostData[field]) {
        alert(`Поле ${field} обязательно для заполнения`);
        return;
      }
    }
  
    try {
      const timestamp = newPostData.date;
      const postData = new FormData();
      postData.append("title", newPostData.title);
      postData.append("content", newPostData.content);
      if (selectedEvents.title == "Arrangement") {
        postData.append(
          "startDate",
          dayjs(newPostData.startDate).format("YYYY-MM-DD HH:mm:ss.SSS")
        );
        postData.append(
          "endDate",
          dayjs(newPostData.endDate).format("YYYY-MM-DD HH:mm:ss.SSS")
        );
      }
      postData.append("date", timestamp);
      postData.append("type", selectedEvents.title);
      const selectedEventsIds = selectedCalendars.map(
        (calendar) => calendar.id
      );
      postData.append("calendars", selectedEventsIds.join(","));
      postData.append("color", newPostData.color);
      if (uploadPostFile) {
        for (const file of uploadPostFile) {
          postData.append("files", file);
          postData.append("filenames", file.name);
        }
      }
  
      const response = await axios.post(
        `http://localhost:3000/api/:calendarId/events`,
        postData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${jwtToken}`,
          },
        }
      );
  
      console.log("Event created:", response.data);
      setNewPostData({
        title: "",
        content: "",
        startDate: "",
        endDate: "",
        date: dayjs(),
        type: "",
        calendars: [],
        files: [],
        color: "#ffffff",
        filenames: "",
      });
      setSelectedEvents("");
      navigate(`/profile/${userId}`);
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

  return (
    <Box style={{ marginLeft: "40%", border: "2px solid grey", padding: "20px", borderRadius: "20px", marginTop: "1%", textAlign: "center" }}>
      <Typography variant="h4" gutterBottom>
        Create New Event
      </Typography>
      <form onSubmit={handleCreateNewPost}>
        <TextField
          label="Title"
          variant="outlined"
          fullWidth
          margin="normal"
          name="title"
          value={newPostData.title}
          onChange={handleNewPostChange}
          required
        style = {{marginTop: "-5px"}}/>
        <TextField
          label="Content"
          variant="outlined"
          fullWidth
          margin="normal"
          name="content"
          value={newPostData.content}
          onChange={handleNewPostChange}
          required
        />
        <Autocomplete
          required
          id="type"
          options={events}
          getOptionLabel={(option) => option.title}
          value={selectedEventType}
          onChange={handleEventTypeChange}
          renderInput={(params) => (
            <TextField {...params} variant="outlined" label="Event Type" />
          )}
        />
        <Autocomplete
          required
          multiple
          id="calendar"
          options={calendars}
          getOptionLabel={(option) => option.name}
          value={selectedCalendars}
          onChange={handleCalendarChange}
          renderInput={(params) => (
            <TextField {...params} variant="outlined" label="Calendar" />
          )}
          style ={{marginTop: "10px"}}/>
        {selectedEventType && selectedEventType.title === "Arrangement" && (
          <Box>
            <TextField
              label="Start date"
              type="datetime-local"
              variant="outlined"
              fullWidth
              margin="normal"
              name="startDate"
              value={dayjs(newPostData.startDate).format("YYYY-MM-DDTHH:mm")}
              onChange={(e) => handleStartDateChange(e.target.value)}
              required
              disabled={
                !selectedEventType || selectedEventType.title !== "Arrangement"
              }
            />
            <TextField
              label="End date"
              type="datetime-local"
              variant="outlined"
              fullWidth
              margin="normal"
              name="endDate"
              value={dayjs(newPostData.endDate).format("YYYY-MM-DDTHH:mm")}
              onChange={(e) => handleEndDateChange(e.target.value)}
              required
              disabled={
                !selectedEventType || selectedEventType.title !== "Arrangement"
              }
            />
          </Box>
        )}
        {selectedEventType &&
          (selectedEventType.title === "Reminder" ||
            selectedEventType.title === "Task") && (
            <TextField
              label="Date and Time"
              type="datetime-local"
              variant="outlined"
              fullWidth
              margin="normal"
              name="date"
              value={dayjs(newPostData.date).format("YYYY-MM-DDTHH:mm")}
              onChange={(e) => handleDateChange(e.target.value)}
              required
              disabled={
                !selectedEventType || selectedEventType.title === "Arrangement"
              }
            />
          )}
        <div style={{ textAlign: 'center', marginLeft: '15%' }}>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileUpload}
          style ={{marginTop: "10px", textAlign: "left" }}/></div>
        <div style={{ marginTop: '20px', marginBottom: '20px', marginLeft: '50%', transform: "translateX(-50%)"}}>
          <CirclePicker color={newPostData.color} onChange={handleColorChange} />
        </div>
        <Button type="button" variant="contained" onClick={handleCancel} style={{ marginRight: "25%" }}>
          Cancel
        </Button>
        <Button type="submit" variant="contained" color="primary">
          Create Event
        </Button>
      </form>
    </Box>
  );
}

export default EventCreationPage;
