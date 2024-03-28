import { Outlet, useLocation } from "react-router-dom";
import Footer from "./Footer/Footer";
import ChronosHeader from "./Header/ChronosHeader";
import React from "react";
import Box from "@mui/material/Box";
import Sidebar from "./Sidebar/Sidebar";
import { CalendarProvider } from "./Sidebar/CalendarContext";

function Layout() {
  const location = useLocation();
  const loginPagePaths = ["/", "/profile/0", "/register"];
  const isLoginPage = loginPagePaths.includes(location.pathname);
  const isConfirmPage = location.pathname.startsWith("/confirm");
  const isRecoverPage = location.pathname.startsWith("/recover");
  const isResetPassPage = location.pathname.startsWith("/reset-password");

  return (
    <div>
      <CalendarProvider>
        <ChronosHeader />
        {isLoginPage || isConfirmPage || isRecoverPage || isResetPassPage ? (
          <Outlet />
        ) : (
          <Box style={{ display: "flex", height: "100%" }}>
            <Sidebar />
            <Outlet />
          </Box>
        )}
        <Footer />
      </CalendarProvider>
    </div>
  );
}

export default Layout;
