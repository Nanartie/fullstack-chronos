import React, { useState, useEffect } from "react";
import { CirclePicker } from "react-color";
import { Popover, ListItem, List, TextField, Button, Box } from "@mui/material";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
function EventOptionsMenu(props) {
  const {
    id,
    open,
    anchorEl,
    handleClose,
    selectedEvent,
    update,
  } = props;

  const jwtToken = localStorage.getItem("jwtToken");
  const [color, setColor] = useState(selectedEvent ? selectedEvent.color : "#ffffff");
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    content: "",
    color: "",
  });

  const handleColorChange = (newColor) => {
    setColor(newColor.hex);
    setFormData((prevFormData) => ({
      ...prevFormData,
      color: newColor.hex,
    }));
  };  

  useEffect(() => {
    if (selectedEvent) {
      setFormData({
        name: selectedEvent.name || "",
        content: selectedEvent.content || "",
        color: selectedEvent.color || "#ffffff",
      });
      setColor(selectedEvent.color || "#ffffff");
    }
  }, [selectedEvent]);  

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const sendDataToAPI = async () => {
    try {
      if (!formData.name) {
        console.error("Name cannot be empty");
        return;
      }
      const response = await axios.patch(
        `http://localhost:3000/api/${selectedEvent.id}/events`,
        {
          name: formData.name,
          content: formData.content,
          color: color,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwtToken}`,
          },
        }
      );
      console.log("Data sent successfully:", response.data);
      update();
      handleClose();
    } catch (error) {
      console.error("Error during changing event options:", error);
      if (error.response.status === 401) {
        localStorage.removeItem("jwtToken");
        navigate("/");
        alert("Token expired");
        window.location.reload();
      }
    }
  };

  const deleteEvent = async () => {
    try {
      const response = await axios.delete(
        `http://localhost:3000/api/${selectedEvent.id}/events`,
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
        }
      );
      console.log("Event deleted successfully:", response.data);
      update();
      handleClose();
    } catch (error) {
      console.error("Error deleting event:", error);
      if (error.response.status === 401) {
        localStorage.removeItem("jwtToken");
        navigate("/");
        alert("Token expired");
        window.location.reload();
      }
    }
  };

  return (
    <Popover
      id={id}
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "center",
      }}
      transformOrigin={{
        vertical: "top",
        horizontal: "center",
      }}
    >
      <List>
        <ListItem>
          <CirclePicker color={color} onChange={handleColorChange} />
        </ListItem>
        {selectedEvent && (
          <Box>
            <ListItem>
              <TextField
                id="name"
                label="Name"
                style={{ width: "100%" }}
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </ListItem>
            <ListItem>
              <TextField
                id="content"
                label="Content"
                style={{ width: "100%" }}
                value={formData.content}
                onChange={handleInputChange}
              />
            </ListItem>
          </Box>
        )}
        <Box
          sx={{ display: "flex" }}
          style={{ justifyContent: "space-between" }}
        >
          <ListItem>
            <Button variant="contained" color="primary" onClick={sendDataToAPI}>
              Save
            </Button>
          </ListItem>
          <ListItem>
            <Button
              variant="contained"
              color="error"
              style={{ marginLeft: "auto" }}
              onClick={deleteEvent}
            >
              Delete
            </Button>
          </ListItem>
        </Box>
      </List>
    </Popover>
  );
}

export default EventOptionsMenu;