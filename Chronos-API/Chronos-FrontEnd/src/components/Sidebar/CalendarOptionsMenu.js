import React, { useState, useEffect } from "react";
import { CirclePicker } from "react-color";
import {
  Popover,
  ListItem,
  List,
  TextField,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function CalendarOptionsMenu(props) {
  const {
    id,
    open,
    anchorEl,
    handleClose,
    selectedCalendar,
    update,
    users,
    currentUserId,
  } = props;

  const jwtToken = localStorage.getItem("jwtToken");
  const [color, setColor] = useState(
    selectedCalendar ? selectedCalendar.color : "#ffffff"
  );

  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "",
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDeleteUserOpen, setDialogDeleteUserOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableUsersForDelete, setAvailableUsersForDelete] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const handleColorChange = (newColor) => {
    setColor(newColor.hex);
    setFormData((prevFormData) => ({
      ...prevFormData,
      color: newColor.hex,
    }));
  };

  const fetchIsOwner = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/${selectedCalendar.id}/users/${currentUserId}`,
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
        }
      );
      setIsOwner(response.data.isOwner);
    } catch (error) {
      console.error("Error fetching user info:", error);
      if (error.response && error.response.status === 401) {
        localStorage.removeItem("jwtToken");
        navigate("/");
        alert("Token expired");
        window.location.reload();
      }
    }
  };

  useEffect(() => {
    if (selectedCalendar) {
      setFormData({
        name: selectedCalendar.name || "",
        description: selectedCalendar.description || "",
        color: selectedCalendar.color || "#ffffff",
      });
      setColor(selectedCalendar.color || "#ffffff");
      fetchIsOwner();
    }
  }, [selectedCalendar, isOwner, availableUsers]);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  const fetchData = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/${selectedCalendar.id}/available-users`,
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
        }
      );
      setAvailableUsers(response.data);
    } catch (error) {
      console.error("Error fetching available users:", error);
    }
  };

  const fetchDataForDelete = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/${selectedCalendar.id}/userslist`,
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
        }
      );
      if (Array.isArray(response.data.users)) {
        setAvailableUsersForDelete(response.data.users);
      } else {
        console.error("Response data is not an array:", response.data);
      }
    } catch (error) {
      console.error("Error fetching available users for delete:", error);
    }
  };
  

  const sendDataToAPI = async () => {
    try {
      if (!formData.name) {
        console.error("Name cannot be empty");
        return;
      }
      const response = await axios.patch(
        `http://localhost:3000/api/${selectedCalendar.id}/calendars`,
        {
          name: formData.name,
          description: formData.description,
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
      console.error("Error during changing calendars options:", error);
      if (error.response.status === 401) {
        localStorage.removeItem("jwtToken");
        navigate("/");
        alert("Token expired");
        window.location.reload();
      }
    }
  };

  const deleteCalendar = async () => {
    try {
      const response = await axios.delete(
        `http://localhost:3000/api/${selectedCalendar.id}/calendars`,
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
        }
      );
      console.log("Calendar deleted successfully:", response.data);
      update();
      window.location.reload();
      handleClose();
    } catch (error) {
      console.error("Error deleting calendar:", error);
      if (error.response.status === 401) {
        localStorage.removeItem("jwtToken");
        navigate("/");
        alert("Token expired");
        window.location.reload();
      }
    }
  };

  const handleDialogOpen = () => {
    fetchData();
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const handleDialogDeleteUserOpen = () => {
    fetchDataForDelete();
    setDialogDeleteUserOpen(true);
  };

  const handleDialogDeleteUserClose = () => {
    setDialogDeleteUserOpen(false);
  };

  const handleUserSelect = async (user) => {
    try {
      const response = await axios.post(
        `http://localhost:3000/api/${selectedCalendar.id}/users`,
        {
          userId: user.id,
        },
        {
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
        }
      );
      console.log("User added successfully:", response.data);
      update();
      fetchData();
    } catch (error) {
      console.error("Error adding user to calendar:", error);
      if (error.response.status === 401) {
        localStorage.removeItem("jwtToken");
        navigate("/");
        alert("Token expired");
        window.location.reload();
      }
    }
  };


  const handleUserSelectDelete = async (user) => {
    try {
      const response = await axios.delete(
        `http://localhost:3000/api/${selectedCalendar.id}/users`,
        {
          data: { userId: user.id },
          headers: {
            Authorization: `Bearer ${jwtToken}`,
          },
        }
      );      
      console.log("User deleted successfully:", response.data);
      update();
      fetchDataForDelete();
    } catch (error) {
      console.error("Error deleting user from calendar:", error);
      if (error.response.status === 401) {
        localStorage.removeItem("jwtToken");
        navigate("/");
        alert("Token expired");
        window.location.reload();
      }
    }
  };

  return (
    <>
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
        {isOwner && (
          <Box>
            <ListItem>
              <CirclePicker color={color} onChange={handleColorChange} />
            </ListItem>
            {selectedCalendar && selectedCalendar.name !== "Personal" && (
              <>
                <ListItem>
                  <TextField
                    id="name"
                    label="Name"
                    style={{ width: "100%" }}
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    disabled={selectedCalendar.name === "Personal"}
                  />
                </ListItem>
                <ListItem>
                  <TextField
                    id="description"
                    label="Description"
                    style={{ width: "100%" }}
                    value={formData.description}
                    onChange={handleInputChange}
                    disabled={selectedCalendar.name === "Personal"}
                  />
                </ListItem>
                <ListItem>
                  <Button onClick={handleDialogOpen}>Add user</Button>
                  <Button onClick={handleDialogDeleteUserOpen}>Delete user</Button>
                </ListItem>
               
              </>
            )}
          </Box>
        )}
          <Box
            sx={{ display: "flex" }}
            style={{ justifyContent: "space-between" }}
          >
            {isOwner && (
              <ListItem>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={sendDataToAPI}
                  disabled={!isOwner}
                >
                  Save
                </Button>
              </ListItem>
            )}
            {selectedCalendar && selectedCalendar.name !== "Personal" && (
              <ListItem>
                <Button
                  variant="contained"
                  color="error"
                  onClick={deleteCalendar}
                >
                  Delete
                </Button>
              </ListItem>
            )}
          </Box>
        </List>
      </Popover>
      <Dialog open={dialogOpen} onClose={handleDialogClose}>
        <DialogTitle>Add User</DialogTitle>
        <DialogContent>
          {availableUsers &&
            availableUsers.map(
              (user) =>
                user.id !== currentUserId && (
                  <Button key={user.id} onClick={() => handleUserSelect(user)}>
                    {user.login}
                  </Button>
                )
            )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dialogDeleteUserOpen} onClose={handleDialogDeleteUserClose}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          {availableUsersForDelete &&
            availableUsersForDelete.map(
              (user) =>
                user.id !== currentUserId && (
                  <Button
                    key={user.id}
                    onClick={() => handleUserSelectDelete(user)}
                  >
                    {user.login}
                  </Button>
                )
            )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogDeleteUserClose}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default CalendarOptionsMenu;