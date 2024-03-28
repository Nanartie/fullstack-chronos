import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from 'dayjs';
import IconButton from "@mui/material/IconButton";
import SettingsIcon from "@mui/icons-material/Settings";
import EventOptionsMenu from "./EventOptionsMenu";

import {
  Container,
  Typography,
  Button,
  CircularProgress,
  Paper,
  TextField,
  Grid,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Autocomplete,
} from "@mui/material";
import Calendar from "../Calendar/Calendar";
import { Avatar } from "@mui/material";
import { jwtDecode } from "jwt-decode";
import { DateTimePicker, renderTimeViewClock } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";

function UserProfile() {
  const { userId } = useParams();
  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({ name: "", login: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [postsKey, setPostsKey] = useState(0);
  const [events, setEvents] = useState([]);
  const jwtToken = localStorage.getItem("jwtToken");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [config, setConfig] = useState("");
  const [anchorElSettings, setAnchorElSettings] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const navigate = useNavigate();

  const headers = {
    Authorization: `Bearer ${jwtToken}`,
  };
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    async function fetchUserData() {
      try {
        const response = await axios.get(
          `http://localhost:3000/api/users/${userId}`
        );
        const data = response.data;
        setUserData(data);
        setConfig(`http://localhost:3000/api/posts/user/${userId}`);
      } catch (error) {
        console.error("Ошибка при получении данных пользователя:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUserData();
    fetchEvents();
  }, [userId]);

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`http://localhost:3000/api/profilevents/${userId}`, {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      });
      setEvents(response.data);
    } catch (error) {
      console.error("Error fetching events from database:", error);
      
    }
  };

  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.full_name || "",
        login: userData.login || "",
        email: userData.email || "",
      });
      setPostsKey((prevKey) => prevKey + 1);
    }
  }, [userData, config]);
  if (loading) {
    return (
      <Container style={{ textAlign: "center", marginTop: "10%" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!userData) {
    return (
      <Container style={{ textAlign: "center", marginTop: "10%" }}>
        <Typography variant="h5" gutterBottom>
          Failed to load user data.
        </Typography>
      </Container>
    );
  }

  const handleCloseSettings = () => {
    setAnchorElSettings(null);
  };

  const handleClickSettings = (event, eventInfo) => {
    event.preventDefault();
    setAnchorElSettings(event.currentTarget);
    setSelectedEvent(eventInfo);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSaveChanges = (e) => {
    e.preventDefault();
    try {
      axios
        .patch(
          `http://localhost:3000/api/users/${userId}`,
          {
            userId: userId,
            fullName: formData.name,
            email: formData.email,
            login: formData.login,
          },
          { headers: headers }
        )
        .then((response) => {
          setIsEditing(false);
          window.location.reload();
        })
        .catch((error) => {
          if (error.response.status === 401) {
            localStorage.removeItem("jwtToken");
            navigate("/");
            alert("Token expired");
            window.location.reload();
          }
        });
    } catch (error) {
      console.error("Ошибка при отправке изменённых данных:", error);
    }
  };

  const handleEditProfile = (e) => {
    e.preventDefault();
    axios
      .post(
        "http://localhost:3000/api/users/edit",
        {
          userId: userId,
        },
        { headers: headers }
      )
      .then((response) => {
        setIsEditing(true);
      })
      .catch((error) => {
        if (error.response.status === 401) {
          localStorage.removeItem("jwtToken");
          navigate("/");
          alert("Token expired");
          window.location.reload();
        }
      });
  };

  const handleCancelEdit = (e) => {
    e.preventDefault();
    setIsEditing(false);
  };

  const handleLogout = (e) => {
    e.preventDefault();
    axios
      .post("http://localhost:3000/api/auth/logout", {}, { headers: headers })
      .then((response) => {
        localStorage.removeItem("jwtToken");
        navigate("/");
        window.location.reload();
      })
      .catch((error) => {
        if (error.response.status === 401) {
          localStorage.removeItem("jwtToken");
          navigate("/");
          alert("Token expired");
          window.location.reload();
        }
        console.error(error);
      });
  };

  const handleOpenDeleteConfirmation = () => {
    setShowDeleteConfirmation(true);
  };
  const handleCloseDeleteConfirmation = () => {
    setShowDeleteConfirmation(false);
  };

  const handleDeleteProfile = () => {
    axios
      .delete(`http://localhost:3000/api/users/${userId}`, { headers: headers })
      .then((response) => {
        if ("admin" !== (jwtToken != null ? jwtDecode(jwtToken).role : "")) {
          localStorage.removeItem("jwtToken");
          navigate("/");
        } else {
          window.location.reload();
        }
      })
      .catch((error) => {
        if (error.response.status === 401) {
          localStorage.removeItem("jwtToken");
          navigate("/");
          alert("Token expired");
          window.location.reload();
        }
        console.error("Ошибка при удалении профиля:", error);
      });

    setShowDeleteConfirmation(false);
  };

  const handleAvatarChange = () => {
    inputRef.current.click();
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const userAvatar = new FormData();
      userAvatar.append("avatar", file);
      await axios
        .patch(`http://localhost:3000/api/users/update/avatar`, userAvatar, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${jwtToken}`,
            target: userId,
          },
        })
        .then((response) => {
          const data = response.data;
          console.log(data);
          window.location.reload();
        })
        .catch((error) => {
          console.error("Ошибка при загрузке аватара:", error);
          if (error.response.status === 401) {
            localStorage.removeItem("jwtToken");
            navigate("/");
            alert("Token expired");
            window.location.reload();
          }
        });
    }
  };

  function getTextColor(backgroundColor) {
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

  const handleCreatePostPageNavigation = () => {
    navigate(`/create-event/${userId}`);
  };

  return (
    <Box style={{ width: "81%", marginLeft: "16%" }}>
      <Box
        style={{ marginLeft: "10px", paddingBottom: "130px", width: "100%" }}
      >
        <Box>
          <Paper
            elevation={3}
            style={{ marginTop: "10px", padding: "20px", width: "100%" }}
          >
            <Box style={{ display: "flex", width: "100%" }}>
              <Box>
                <Typography variant="h4" gutterBottom>
                  User's profile
                </Typography>
                <Avatar
                  src={`http://localhost:3000/${userData.avatar}`}
                  sx={{ width: 100, height: 100, marginBottom: 2 }}
                  onClick={handleAvatarChange}
                />
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleAvatarUpload}
                  ref={inputRef}
                />
                {isEditing ? (
                  <form onSubmit={handleSaveChanges}>
                    <TextField
                      label="Name"
                      variant="outlined"
                      fullWidth
                      margin="normal"
                      name="name"
                      value={formData.name !== null ? formData.name : undefined}
                      onChange={handleChange}
                    />
                    <TextField
                      label="Login"
                      variant="outlined"
                      fullWidth
                      margin="normal"
                      name="login"
                      value={formData.login}
                      onChange={handleChange}
                    />
                    <TextField
                      label="Email"
                      variant="outlined"
                      fullWidth
                      margin="normal"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                    />
                    <Grid container justifyContent="space-between">
                      <Box>
                        <Button
                          variant="contained"
                          color="primary"
                          type="submit"
                        >
                          Save changes
                        </Button>
                        <Button
                          style={{ marginLeft: "8px" }}
                          variant="contained"
                          color="inherit"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </Button>
                      </Box>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={handleOpenDeleteConfirmation}
                      >
                        Delete account
                      </Button>
                    </Grid>
                    <Dialog
                      open={showDeleteConfirmation}
                      onClose={handleCloseDeleteConfirmation}
                    >
                      <DialogTitle>Delete confirmation</DialogTitle>
                      <DialogContent>
                        <DialogContentText>
                          Are you sure you want to delete your account? This
                          action irreversible and will lead to the complete
                          removal of everything associated with your profile
                          including: login, password.
                        </DialogContentText>
                      </DialogContent>
                      <DialogActions>
                        <Button
                          onClick={handleCloseDeleteConfirmation}
                          color="primary"
                        >
                          Cancel
                        </Button>
                        <Button onClick={handleDeleteProfile} color="error">
                          Delete account
                        </Button>
                      </DialogActions>
                    </Dialog>
                  </form>
                ) : (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Name: {userData.full_name}
                    </Typography>
                    <Typography variant="h6" gutterBottom>
                      Login: {userData.login}
                    </Typography>
                    <Typography variant="h6" gutterBottom>
                      Email: {userData.email}
                    </Typography>
                    {userData.id ===
                    (jwtToken != null ? jwtDecode(jwtToken).userId : "") ? (
                      <Box>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleEditProfile}
                        >
                          Edit profile
                        </Button>
                        <Button
                          style={{ marginLeft: "8px" }}
                          variant="contained"
                          color="primary"
                          onClick={handleLogout}
                        >
                          Logout
                        </Button>
                      </Box>
                    ) : (
                      <>
                        {"admin" ===
                          (jwtToken != null
                            ? jwtDecode(jwtToken).role
                            : "") && (
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={handleEditProfile}
                          >
                            Edit profile
                          </Button>
                        )}
                      </>
                    )}
                  </Box>
                )}
              </Box>
              {isEditing ? null : <Calendar />}
            </Box>
          </Paper>
          {isEditing ? null : (
            <Paper
              elevation={3}
              style={{ padding: "20px", marginTop: "10px", width: "100%" }}
            >
              <Box style={{ display: "flex" }}>
                <Typography variant="h5" gutterBottom>
                  Planned events
                </Typography>
                {userData.id ===
                  (jwtToken != null ? jwtDecode(jwtToken).userId : "") && (
                  <Button
                    variant="outlined"
                    style={{ marginBottom: "5px", marginLeft: "5px" }}
                    onClick={handleCreatePostPageNavigation}
                  >
                    Add
                  </Button>
                )}
              </Box>
              {events.map((eventInfo) => (
                <Paper 
                  key={eventInfo.id} 
                  elevation={3} 
                  style={{ 
                    padding: "10px", 
                    marginTop: "10px", 
                    backgroundColor: eventInfo.color, 
                    color: getTextColor(eventInfo.color), 
                    position: "relative" 
                  }}
                >
                  <IconButton 
                    onClick={(event) => handleClickSettings(event, eventInfo)}
                    style={{ 
                      position: "absolute", 
                      top: "5px", 
                      right: "5px",
                      color: getTextColor(eventInfo.color)
                    }}
                  >
                    <SettingsIcon />
                  </IconButton>
                  <EventOptionsMenu
                    id="settings-popover"
                    open={Boolean(anchorElSettings)}
                    anchorEl={anchorElSettings}
                    handleClose={handleCloseSettings}
                    selectedEvent={selectedEvent}
                    update={fetchEvents}
                  />
                  <Typography variant="h6" gutterBottom>
                    {eventInfo.name}
                  </Typography>
                  {eventInfo.type === "Task" || eventInfo.type === "Reminder" ? (
                    <Typography variant="subtitle1" gutterBottom>
                      {eventInfo.type}, {dayjs(eventInfo.start).format("DD-MM-YYYY HH:mm")}
                    </Typography>
                  ) : (
                    <Typography variant="subtitle1" gutterBottom>
                      {eventInfo.type}, {dayjs(eventInfo.start).format("DD-MM-YYYY")} - {dayjs(eventInfo.end).format("DD-MM-YYYY")}
                    </Typography>
                  )}
                  <Typography variant="subtitle1" gutterBottom>
                    {eventInfo.content}
                  </Typography>
                  {eventInfo.file && (
                    <Typography variant="subtitle1" gutterBottom>
                      <a href={`http://localhost:3000/post_files/${eventInfo.file}`} download>
                        <Button variant="outlined"  style={{color: getTextColor(eventInfo.color),
    borderColor: getTextColor(eventInfo.color) }}>File {eventInfo.file}</Button>
                      </a>
                    </Typography>
                  )}
                </Paper>
              ))}
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default UserProfile;