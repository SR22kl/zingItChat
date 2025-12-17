import { useLocation } from "react-router-dom";
import useLayoutStore from "../store/layoutStore";
import { useEffect, useState } from "react";
import useThemeStore from "../store/themeStore.js";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "../pages/chatSection/ChatWindow.jsx";

const Layout = ({
  children,
  isThemeDialogOpen,
  tooggleThemeDialog,
  isStatusPreviewOpen,
  statusPreviewContent,
}) => {
  const selectedContact = useLayoutStore((state) => state.selectedContact);
  const setSelectedContact = useLayoutStore(
    (state) => state.setSelectedContact
  );
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <>
      <div
        className={`min-h-screen ${
          theme === "dark" ? "bg-neutral-950 text-white" : "bg-white text-black"
        } flex relative`}
      >
        {!isMobile && <Sidebar />}
        <div
          className={`flex-1 flex overflow-hidden ${
            isMobile ? "flex-col" : ""
          }`}
        >
          <AnimatePresence initial={false}>
            {(!selectedContact || !isMobile) && (
              <motion.div
                key="ChatList"
                initial={{ x: isMobile ? "-100%" : 0 }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.3 }}
                className={`w-full md:w-2/5 h-full ${isMobile ? "pb-16" : ""}`}
              >
                {children}
              </motion.div>
            )}

            {(selectedContact || !isMobile) && (
              <motion.div
                key="ChatWindow"
                initial={{ x: isMobile ? "-100%" : 0 }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.5 }}
                className="w-full h-full"
              >
                <ChatWindow
                  selectedContact={selectedContact}
                  setSelectedContact={setSelectedContact}
                  isMobile={isMobile}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {isMobile && <Sidebar />}

        {isThemeDialogOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-indigo-950/80">
            <div
              className={`${
                theme === "dark"
                  ? "bg-slate-700 text-white"
                  : "bg-white text-black"
              } p-6 rounded-lg shadow-lg max-w-sm w-full`}
            >
              <h2 className="text-2xl font-semibold mb-4">Choose your theme</h2>
              <div className="space-y-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    value="light"
                    checked={theme === "light"}
                    onChange={() => setTheme("light")}
                    className="text-indigo-600"
                  />
                  <span>Light</span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    value="dark"
                    checked={theme === "dark"}
                    onChange={() => setTheme("dark")}
                    className="text-indigo-600"
                  />
                  <span>Dark</span>
                </label>
              </div>
              <button
                className={`mt-6 w-full py-2 rounded-md bg-linear-to-br from-indigo-600 to-indigo-600 opacity-90 hover:opacity-100 transition duration-300 ease-in ${
                  theme === "dark" ? "text-white" : "text-gray-300"
                } cursor-pointer`}
                onClick={tooggleThemeDialog}
              >
                Close
              </button>
            </div>
          </div>
        )}
        {/* status preview  */}
        {isStatusPreviewOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
            <div className="fixed inset-0 flex items-center justify-center z-50">
              {statusPreviewContent}
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default Layout;
