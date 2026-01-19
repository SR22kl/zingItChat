import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import useThemeStore from "../store/themeStore";
import useUserStore from "../store/useUserStore";
import useLayoutStore from "../store/layoutStore";
import { RiChatSmileAiLine } from "react-icons/ri";
import { HiOutlineStatusOnline } from "react-icons/hi";
import { FaUserNinja } from "react-icons/fa";
import { motion } from "framer-motion";
import { IoSettingsOutline } from "react-icons/io5";

const Sidebar = () => {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { theme, setTheme } = useThemeStore();
  const { user } = useUserStore();
  const { activeTab, setActiveTab, selectedContact } = useLayoutStore();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (location.pathname === "/") {
      setActiveTab("chats");
    } else if (location.pathname === "/user-profile") {
      setActiveTab("profile");
    } else if (location.pathname === "/status") {
      setActiveTab("status");
    } else if (location.pathname === "/settings") {
      setActiveTab("settings");
    }
  }, [location, setActiveTab]);

  if (isMobile && selectedContact) {
    return null;
  }

  const SidebarContent = (
    <>
      <Link to="/">
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={`${isMobile ? "" : "mb-8"} ${
            activeTab === "chats" &&
            "bg-linear-to-br from-purple-500 to-pink-500 shadow-lg"
          } p-3 hover:bg-linear-to-br hover:from-purple-400 hover:to-pink-400 rounded-2xl transition-all duration-300 ease-in-out focus:outline-none hover:shadow-xl`}
        >
          <RiChatSmileAiLine
            className={`w-6 h-6 ${
              activeTab === "chats"
                ? "text-white"
                : theme === "dark"
                  ? "text-gray-300"
                  : "text-gray-700"
            } transition-colors duration-200`}
          />
        </motion.div>
      </Link>
      <Link to="/status">
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={`${isMobile ? "" : "mb-8"} ${
            activeTab === "status" &&
            "bg-linear-to-br from-green-500 to-teal-500 shadow-lg"
          } p-3 hover:bg-linear-to-br hover:from-green-400 hover:to-teal-400 rounded-2xl transition-all duration-300 ease-in-out focus:outline-none hover:shadow-xl`}
        >
          <HiOutlineStatusOnline
            className={`w-6 h-6 ${
              activeTab === "status"
                ? "text-white"
                : theme === "dark"
                  ? "text-gray-300"
                  : "text-gray-700"
            } transition-colors duration-200`}
          />
        </motion.div>
      </Link>
      {!isMobile && <div className=" grow" />}

      <Link to="/user-profile">
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={`${isMobile ? "" : "mb-8"} ${
            activeTab === "user-profile" &&
            "bg-linear-to-br from-blue-500 to-cyan-500 shadow-lg"
          } p-3 hover:bg-linear-to-br hover:from-blue-400 hover:to-cyan-400 rounded-2xl transition-all duration-300 ease-in-out focus:outline-none hover:shadow-xl`}
        >
          {user?.profilePicture ? (
            <img
              src={user?.profilePicture}
              alt="user"
              className="w-6 h-6 rounded-full border-2 border-white/50"
            />
          ) : (
            <FaUserNinja
              className={`w-6 h-6 ${
                activeTab === "user-profile"
                  ? "text-white"
                  : theme === "dark"
                    ? "text-gray-300"
                    : "text-gray-700"
              } transition-colors duration-200`}
            />
          )}
        </motion.div>
      </Link>
      <Link to="/settings">
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className={`${isMobile ? "" : "mb-8"} ${
            activeTab === "settings" &&
            "bg-linear-to-br from-purple-500 to-pink-500 shadow-lg"
          } p-3 hover:bg-linear-to-br hover:from-purple-400 hover:to-pink-400 rounded-2xl transition-all duration-300 ease-in-out focus:outline-none hover:shadow-xl`}
        >
          <IoSettingsOutline
            className={`w-6 h-6 ${
              activeTab === "settings"
                ? "text-white"
                : theme === "dark"
                  ? "text-gray-300"
                  : "text-gray-700"
            } transition-colors duration-200`}
          />
        </motion.div>
      </Link>
    </>
  );
  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: isMobile ? 0 : -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`${
          isMobile
            ? "fixed bottom-0 left-0 right-0 h-16"
            : "w-16 h-screen border-r-2 shadow-lg"
        } ${
          theme === "dark"
            ? "bg-slate-900/80 border-gray-700/50"
            : "bg-white/80 border-gray-200/50"
        } backdrop-blur-xl flex items-center py-4 shadow-2xl ${
          isMobile ? "flex-row justify-around" : "flex-col justify-between"
        }`}
        style={{
          boxShadow: isMobile
            ? "0 -4px 20px rgba(0, 0, 0, 0.1)"
            : "4px 0 20px rgba(0, 0, 0, 0.1)",
        }}
      >
        {SidebarContent}
      </motion.div>
    </>
  );
};

export default Sidebar;
