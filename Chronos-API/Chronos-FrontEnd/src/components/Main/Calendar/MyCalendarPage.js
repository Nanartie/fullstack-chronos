import * as React from "react";
import dayjs from "dayjs";
import weekOfYear from "dayjs/plugin/weekOfYear";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Table,
  TableBody,
  TableHead,
  TableRow,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Popover,
  Button,
  Box,
  TableContainer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
} from "@mui/material";
import { Tablecell } from "./MyCalendarPage.style";
import { useState, useEffect } from "react";
import axios from "axios";
import { DateTimePicker, renderTimeViewClock } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { useCalendar } from "../../Sidebar/CalendarContext";
import { CirclePicker } from "react-color";

dayjs.extend(weekOfYear);

const VIEW_MODE = {
  WEEK: "WEEK",
  MONTH: "MONTH",
  YEAR: "YEAR",
};

export default function Calendar() {
  const { calendarId } = useParams();
  const [selectedMonth, setSelectedMonth] = React.useState(dayjs().month() + 1);
  const [selectedYear, setSelectedYear] = React.useState(dayjs().year());
  const [selectedWeek, setSelectedWeek] = React.useState(dayjs().week());
  const [selectedCell, setSelectedCell] = React.useState(null);
  const [holidays, setHolidays] = React.useState([]);
  const [eventsCalendar, setEventsCalendar] = useState([]);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [holidayName, setHolidayName] = React.useState("");
  const [eventName, setEventName] = React.useState("");
  const [viewMode, setViewMode] = React.useState(VIEW_MODE.MONTH);
  const [selectedCellWeeks, setSelectedCellWeeks] = useState({
    row: null,
    col: null,
  });
  const [countryCode, setCountryCode] = useState("");
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);

  const [newPostData, setNewPostData] = useState({
    title: "",
    content: "",
    date: dayjs(),
    startDate: dayjs(),
    endDate: dayjs(),
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

  const handleDateChange = (date) => {
    setNewPostData({
      ...newPostData,
      date: date,
    });
  };

  const handleStartDateChange = (startDate) => {
    setNewPostData({
      ...newPostData,
      startDate: dayjs(startDate).format("YYYY-MM-DD HH:mm:ss.SSS"),
    });
  };

  const handleEndDateChange = (endDate) => {
    setNewPostData({
      ...newPostData,
      endDate: dayjs(endDate).format("YYYY-MM-DD HH:mm:ss.SSS"),
    });
  };

  const [selectedEventType, setSelectedEventType] = useState(null);
  const [selectedCalendars, setSelectedCalendars] = useState([]);
  const [uploadPostFile, setUploadPostFile] = useState([]);
  const jwtToken = localStorage.getItem("jwtToken");
  const navigate = useNavigate();
  const [nameCalendar, setNameCalendar] = useState();
  const { calendars } = useCalendar();

  React.useEffect(() => {
    if (countryCode) {
      fetchHolidays();
    }
    fetchEvents();
  }, [selectedYear, selectedMonth, countryCode, viewMode, calendarId]);

  useEffect(() => {
    fetchLocation();
  }, []);

  const fetchLocation = async () => {
    try {
      const response = await axios.get(
        "https://api.ipgeolocation.io/ipgeo?apiKey=6c5eec33719c4894a61e3be58f014d4c"
      );
      const data = response.data;
      const countryCode = data.country_code2;
      setCountryCode(countryCode);
    } catch (error) {
      console.error("Error fetching location:", error);
    }
  };


  useEffect(() => {
    if (calendars.length === 0) {
      return;
    }
    const calFind = calendars.find((cal) => cal.id == calendarId);
    if (!calFind) {
      navigate("/error");
      return;
    }
    if (calFind.name != "Personal") {
      setNameCalendar(false);
    } else {
      setNameCalendar(true);
    }
  }, [calendars, calendarId, nameCalendar]);

  const [selectedEvents, setSelectedEvents] = useState("");

  const handleEventTypeChange = (event, newValue) => {
    setSelectedEventType(newValue);
    setSelectedEvents(newValue);
  };

  const handleMonthChange = (event) => {
    setSelectedMonth(parseInt(event.target.value));
  };

  const handleYearChange = (event) => {
    setSelectedYear(parseInt(event.target.value));
  };

  const handleWeekChange = (event) => {
    setSelectedWeek(parseInt(event.target.value));
  };

  const handleViewModeChange = (event) => {
    setViewMode(event.target.value);
  };

  const handleEventFormOpen = () => {
    setIsEventFormOpen(true);
    setAnchorEl(null);
  };

  const handleEventFormClose = () => {
    setIsEventFormOpen(false);
  };

  const getDayInfo = (day, month, year) => {
    const currentDate = dayjs().year(year).month(month - 1).date(day);
    let holiday = null;
    let isToday = currentDate.isSame(dayjs(), "day");
    let isCurrentMonth = currentDate.month() + 1 === dayjs().month() + 1;

    if (nameCalendar) {
        holiday = holidays.find((holiday) => {
            const holidayDate = dayjs(holiday.date);
            return (
                holidayDate.date() === day &&
                holidayDate.month() + 1 === month &&
                holidayDate.year() === year
            );
        });
    }

    const event = eventsCalendar.find((evnt) => {
        const eventStartDate = dayjs(evnt.start);
        const eventEndDate = dayjs(evnt.end);
        return (
          currentDate.isSame(eventStartDate, 'day') || currentDate.isBetween(eventStartDate, eventEndDate, null, "()") ||
            currentDate.isSame(eventEndDate, 'day') 
        );
    });

    return {
        day,
        month,
        year,
        isHoliday: !!holiday,
        isEvent: !!event,
        holidayName: holiday ? holiday.name : null,
        eventName: event ? event.name : null,
        isToday,
        isCurrentMonth,
    };
};


  const fetchEvents = async () => {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/mycalendar/${calendarId}`
      );
      setEventsCalendar(response.data);
    } catch (error) {
      console.error("Error fetching events from database:", error);
    }
  };

  const fetchHolidays = async () => {
    try {
      const response = await axios.get(
        `https://date.nager.at/api/v3/PublicHolidays/${selectedYear}/${countryCode}`
      );
      const data = response.data;
      setHolidays(data);
    } catch (error) {
      console.error("Error fetching holidays:", error);
    }
  };

  const handleCellClick = (day, month, year, event) => {
    setSelectedCell({ day, month, year });
    setAnchorEl(event.currentTarget);

    const { isHoliday, holidayName, isEvent, eventName } = getDayInfo(
      day,
      month,
      year
    );

    if (isHoliday) {
      setHolidayName(holidayName);
    } else {
      setHolidayName("");
    }

    if (isEvent) {
      setEventName(eventName);
    } else {
      setEventName("");
      const selectedDate = dayjs()
        .year(year)
        .month(month - 1)
        .date(day)
        .startOf("day");
      setNewPostData({
        ...newPostData,
        date: selectedDate,
      });
    }
  };
  const handleClosePopover = () => {
    setAnchorEl(null);
  };

  const handleNewPostChange = (e) => {
    const { name, value } = e.target;
    setNewPostData({
      ...newPostData,
      [name]: value,
    });
  };

  const handleCalendarChange = (event, newValue) => {
    setSelectedCalendars(newValue);
  };

  const handleFileUpload = (e) => {
    const files = e.target.files;
    setUploadPostFile(files);
  };

  const handleColorChange = (color) => {
    setNewPostData({
      ...newPostData,
      color: color.hex,
    });
  };

  const handleCreateNewPost = async () => { 
    const requiredFields = ["title", "content", "date"];

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
      postData.append("date", timestamp);
      postData.append("type", selectedEvents.title);
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
      const calIdData = calendarId + ', ';
      postData.append("calendars", calIdData);
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
      setSelectedEvents([]);
      setIsEventFormOpen(false);
      fetchEvents();
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

  const renderCalendar = () => {
    switch (viewMode) {
      case VIEW_MODE.WEEK:
        return renderWeekView();
      case VIEW_MODE.YEAR:
        return renderYearView();
      case VIEW_MODE.MONTH:
      default:
        return renderMonthView();
    }
  };

  const renderWeekView = () => {
    const firstDayOfYear = dayjs().year(selectedYear).startOf("year");
    const lastDayOfYear = dayjs().year(selectedYear).endOf("year");
    const weeksInYear = lastDayOfYear.diff(firstDayOfYear, "week") + 1;
  
    let weeks = Array.from({ length: weeksInYear }, (_, i) => i + 1);
  
    if (lastDayOfYear.startOf("week").isSame(lastDayOfYear, "day")) {
      weeks.push(weeksInYear + 1);
    }
  
    if (weeks.includes(weeksInYear + 1)) {
      const startOfWeek54 = getWeekStartDate(selectedYear, weeksInYear + 1).startOf("week");
      const endOfWeek54 = getWeekStartDate(selectedYear, weeksInYear + 1).endOf("week");
      let isEmpty = true;
      for (let i = 0; i < 7; i++) {
        const currentDate = startOfWeek54.add(i, "day");
        if (!currentDate.isBefore(firstDayOfYear) && !currentDate.isAfter(lastDayOfYear)) {
          isEmpty = false;
          break;
        }
      }
      if (isEmpty) {
        weeks.pop();
      }
    }
  
    return (
      <Box sx={{ width: "100%", overflow: "hidden" }}>
        <TableContainer sx={{ maxHeight: 640 }}>
          <Table>
            <TableHead>
              <TableRow>
                <Tablecell>Week</Tablecell>
                {[...Array(7)].map((_, index) => (
                  <Tablecell key={index}>
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][index]}
                  </Tablecell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {weeks.map((weekNumber) => {
                const startOfWeek = getWeekStartDate(selectedYear, weekNumber).startOf("week");
                const endOfWeek = getWeekStartDate(selectedYear, weekNumber).endOf("week");
                const holidaysForWeek = holidays.filter((holiday) =>
                  dayjs(holiday.date).isBetween(startOfWeek, endOfWeek, null, "[]")
                );
                return (
                  <TableRow key={weekNumber}>
                    <Tablecell>{weekNumber}</Tablecell>
                    {[...Array(7)].map((_, index) => {
                      const currentDate = startOfWeek.add(index, "day");
                      if (currentDate.isBefore(firstDayOfYear) || currentDate.isAfter(lastDayOfYear)) {
                        return <Tablecell key={index} />;
                      }
                      const isToday = currentDate.isSame(dayjs(), "day");
                      const holiday = holidaysForWeek.some((h) =>
                        dayjs(h.date).isSame(currentDate, "day")
                      );
                      const isSelected =
                        selectedCellWeeks.row === weekNumber &&
                        selectedCellWeeks.col === index;
                        const event = eventsCalendar.find((evnt) => {
                          const eventStartDate = dayjs(evnt.start);
                          const eventEndDate = dayjs(evnt.end);
                          return (
                            currentDate.isSame(eventStartDate, 'day') || currentDate.isBetween(eventStartDate, eventEndDate, null, "[)") ||
                              currentDate.isSame(eventEndDate, 'day')
                          );
                      });
  
                      const cellStyle = {
                        backgroundColor: event ? event.color : undefined,
                        borderRadius: event ? "10px" : undefined,
                        color: event ? getTextColor(event.color) : undefined
                      };
  
                      if (holiday) {
                        cellStyle.color = "#FF0000";
                      }
  
                      return (
                        <Tablecell
                          key={index}
                          current={isToday}
                          holiday={holiday && nameCalendar}
                          selected={isSelected}
                          onClick={(event) => {
                            setSelectedCellWeeks({
                              row: weekNumber,
                              col: index,
                            });
                            handleCellClick(
                              currentDate.date(),
                              currentDate.month() + 1,
                              currentDate.year(),
                              event
                            );
                          }}
                          style={cellStyle}
                        >
                          {currentDate.format("D MMM")}
                          {event && <div>{event.name}</div>}
                        </Tablecell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };  

  const getWeekStartDate = (year, week) => {
    return dayjs().year(year).week(week).startOf("isoWeek");
  };

  const getWeekEndDate = (year, week) => {
    return dayjs().year(year).week(week).endOf("isoWeek");
  };

  const renderMonthView = () => {
    return (
      <Table>
        <TableHead>
          <TableRow>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
              (day, index) => (
                <Tablecell key={day} weekend={index === 0 || index === 6}>
                  {day}
                </Tablecell>
              )
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {createDaysArray(selectedYear, selectedMonth).map(
            (week, rowIndex) => (
              <TableRow key={rowIndex}>
                {week.map((day, dayIndex) => {
                  const currentDate = dayjs()
                    .year(selectedYear)
                    .month(selectedMonth - 1)
                    .date(day);
                  const {
                    isToday,
                    isCurrentMonth,
                    isHoliday,
                    holidayName,
                    isEvent,
                    eventName,
                  } = getDayInfo(day, selectedMonth, selectedYear);
                      const event = eventsCalendar.find((evnt) => {
                        const eventStartDate = dayjs(evnt.start);
                        const eventEndDate = dayjs(evnt.end);
                        return (
                            currentDate.isBetween(eventStartDate, eventEndDate, null, "[)") ||
                            currentDate.isSame(eventEndDate, 'day')
                        );
                    });
                  const eventStyle = event ? {
                    backgroundColor: event.color,
                    borderRadius: "10px",
                    color: getTextColor(event.color)
                  } : {};
  
                  if (isHoliday) {
                    eventStyle.color = "#FF0000";
                  }
  
                  return (
                    <Tablecell
                      key={dayIndex}
                      current={
                        isToday &&
                        isCurrentMonth &&
                        selectedMonth === dayjs().month() + 1 &&
                        selectedYear === dayjs().year()
                      }
                      holiday={isHoliday}
                      event={isEvent}
                      selected={selectedCell && day === selectedCell.day}
                      onClick={day !== null ? (event) =>
                        handleCellClick(day, selectedMonth, selectedYear, event)
                        : null
                      }
                      style={eventStyle}
                    >
                      {day !== null ? `${day}` : ""}
                      {isEvent && <div>{eventName}</div>}
                    </Tablecell>
                  );
                })}
              </TableRow>
            )
          )}
        </TableBody>
      </Table>
    );
  };  

  const renderYearView = () => {
    const holidaysForYear = holidays.filter(
      (holiday) => dayjs(holiday.date).year() === selectedYear
    );

    const eventsByDate = {};
        eventsCalendar.forEach((event) => {
          const eventStartDate = dayjs(event.start);
          const eventEndDate = dayjs(event.end);
          const startDateKey = eventStartDate.format("YYYY-MM-DD");
          const endDateKey = eventEndDate.format("YYYY-MM-DD");
          for (let date = eventStartDate; date.isBefore(eventEndDate); date = date.add(1, 'day')) {
            const key = date.format("YYYY-MM-DD");
            if (!eventsByDate[key]) {
              eventsByDate[key] = event;
            }
          }
          // Add the end date too
          const endKey = eventEndDate.format("YYYY-MM-DD");
          if (!eventsByDate[endKey]) {
            eventsByDate[endKey] = event;
          }
});

    return (
      <Box style={{ overflowX: "auto", height: "80%" }}>
        <Table>
          <TableHead>
            <TableRow>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <Tablecell key={month}>
                  {dayjs()
                    .month(month - 1)
                    .format("MMMM")}
                </Tablecell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <Tablecell key={month}>
                  <Table>
                    <TableBody>
                      {createDaysArray(selectedYear, month).map(
                        (week, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {week.map((day, dayIndex) => {
                              const currentDate = dayjs()
                                .year(selectedYear)
                                .month(month - 1)
                                .date(day);
                              const isCurrentMonth = currentDate.month() === month - 1;
                              const key = currentDate.format("YYYY-MM-DD");
                              const event = eventsByDate[key];

                              const isHoliday = isHolidayYear(
                                day,
                                month,
                                selectedYear,
                                holidaysForYear
                              );

                              const eventStyle = {
                                backgroundColor: isCurrentMonth && event ? event.color : undefined,
                                borderRadius: isCurrentMonth && event ? "10px" : undefined,
                                color: isCurrentMonth && event ? getTextColor(event.color) : undefined
                              };

                              if (isHoliday) {
                                eventStyle.color = "#FF0000";
                              }

                              return (
                                <Tablecell
                                  key={dayIndex}
                                  current={
                                    currentDate.isSame(dayjs(), "day") &&
                                    currentDate.isSame(dayjs(), "month") &&
                                    currentDate.isSame(dayjs(), "year")
                                  }
                                  holiday={isHoliday}
                                  selected={
                                    selectedCell &&
                                    day === selectedCell.day &&
                                    month === selectedCell.month &&
                                    selectedYear === selectedCell.year
                                  }
                                  onClick={day !== null ? (event) =>
                                    handleCellClick(day, month, selectedYear, event)
                                    : null
                                  }
                                  style={eventStyle}
                                >
                                  {isCurrentMonth ? (day !== null ? day : "") : ""}
                                  {isCurrentMonth && event && (
                                    <div>{event.name}</div>
                                  )}
                                </Tablecell>
                              );
                            })}
                          </TableRow>
                        )
                      )}
                    </TableBody>
                  </Table>
                </Tablecell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </Box>
    );
  };

  const isHolidayYear = (day, month, year, holidaysForYear) => {
    return holidaysForYear.some((holiday) => {
      const holidayDate = dayjs(holiday.date);
      return (
        holidayDate.date() === day &&
        holidayDate.month() + 1 === month &&
        holidayDate.year() === year
      );
    });
  };

  return (
    <Container>
      <Typography variant="h4" align="center" gutterBottom>
        <FormControl>
          <Select value={selectedMonth} onChange={handleMonthChange}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
              <MenuItem key={month} value={month}>
                {dayjs()
                  .month(month - 1)
                  .format("MMMM")}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl>
          <Select value={selectedYear} onChange={handleYearChange}>
            {Array.from({ length: 10 }, (_, i) => dayjs().year() - 5 + i).map(
              (year) => (
                <MenuItem key={year} value={year}>
                  {year}
                </MenuItem>
              )
            )}
          </Select>
        </FormControl>
        <FormControl>
          <Select value={viewMode} onChange={handleViewModeChange}>
            <MenuItem value={VIEW_MODE.MONTH}>Month</MenuItem>
            <MenuItem value={VIEW_MODE.WEEK}>Week</MenuItem>
            <MenuItem value={VIEW_MODE.YEAR}>Year</MenuItem>
          </Select>
        </FormControl>
      </Typography>
      {renderCalendar()}
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={handleClosePopover}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
      >
        <Typography sx={{ p: 2 }}>
          Date:{" "}
          {selectedCell !== null
            ? `${selectedCell.day}.${selectedCell.month}.${selectedCell.year}`
            : ""}
        </Typography>
        <Typography sx={{ p: 2 }}>
          {nameCalendar ? (
            <>
              {holidayName && <span>Holiday: {holidayName}</span>}
              {eventName && <span>Event: {eventName}</span>}
            </>
          ) : (
            eventName && <span>Event: {eventName}</span>
          )}
        </Typography>

        <Button onClick={handleEventFormOpen}>Add event</Button>
      </Popover>
      <Dialog open={isEventFormOpen} onClose={handleEventFormClose}>
        <DialogTitle>Create New Event</DialogTitle>
        <DialogContent>
          <TextField
            label="Title"
            variant="outlined"
            fullWidth
            margin="normal"
            name="title"
            value={newPostData.title}
            onChange={handleNewPostChange}
            required
          />
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
                  !selectedEventType ||
                  selectedEventType.title !== "Arrangement"
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
                  !selectedEventType ||
                  selectedEventType.title !== "Arrangement"
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
                  !selectedEventType ||
                  selectedEventType.title === "Arrangement"
                }
              />
            )}
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
          />
          <div style={{ marginTop: '20px' }}>
            <CirclePicker color={newPostData.color} onChange={handleColorChange} />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEventFormClose} color="primary">
            Cancel
          </Button>
          <Button onClick={handleCreateNewPost} color="primary">
            Create Event
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

function createDaysArray(year, month) {
  const currentDate = dayjs()
    .year(year)
    .month(month - 1)
    .startOf("month");
  const daysInMonth = currentDate.daysInMonth();
  const firstDayOfMonth = currentDate.day();
  const daysArray = [];
  let currentWeek = [];
  let currentDay = 1;

  for (let i = 0; i < firstDayOfMonth; i++) {
    currentWeek.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    currentWeek.push(currentDay);
    currentDay++;

    if (currentWeek.length === 7 || i === daysInMonth) {
      daysArray.push(currentWeek);
      currentWeek = [];
    }
  }

  return daysArray;
}