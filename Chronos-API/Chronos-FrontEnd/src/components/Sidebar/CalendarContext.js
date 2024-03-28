import React, { createContext, useState, useContext } from "react";

const CalendarContext = createContext();

export const useCalendar = () => useContext(CalendarContext);

export const CalendarProvider = ({ children }) => {
  const [calendars, setCalendars] = useState([]);

  return (
    <CalendarContext.Provider value={{ calendars, setCalendars }}>
      {children}
    </CalendarContext.Provider>
  );
};
