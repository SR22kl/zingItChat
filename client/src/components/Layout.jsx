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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`${
                theme === "dark"
                  ? "bg-slate-800/90 text-white"
                  : "bg-white/90 text-black"
              } p-8 rounded-2xl shadow-2xl backdrop-blur-xl border border-white/20 max-w-sm w-full mx-4`}
              style={{
                boxShadow:
                  "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)",
              }}
            >
              <h2 className="text-2xl font-bold mb-6 bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Choose your theme
              </h2>
              <div className="space-y-4">
                <motion.label
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl hover:bg-white/10 transition-all duration-200"
                >
                  <input
                    type="radio"
                    value="light"
                    checked={theme === "light"}
                    onChange={() => setTheme("light")}
                    className="text-purple-500 focus:ring-purple-500"
                  />
                  <span className="font-medium">Light</span>
                </motion.label>

                <motion.label
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center space-x-3 cursor-pointer p-3 rounded-xl hover:bg-white/10 transition-all duration-200"
                >
                  <input
                    type="radio"
                    value="dark"
                    checked={theme === "dark"}
                    onChange={() => setTheme("dark")}
                    className="text-purple-500 focus:ring-purple-500"
                  />
                  <span className="font-medium">Dark</span>
                </motion.label>
              </div>
              <motion.button
                whileHover={{
                  scale: 1.05,
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
                }}
                whileTap={{ scale: 0.95 }}
                className="mt-8 w-full py-3 rounded-xl bg-linear-to-r from-purple-500 to-pink-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={tooggleThemeDialog}
              >
                Close
              </motion.button>
            </motion.div>
          </motion.div>
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
