import "./App.css";
import { Route, Routes } from "react-router-dom";
import Login from "./pages/userLogin/Login";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import { ProtectedRoute, PublicRoute } from "./protect/protectedRoute";
import Home from "./pages/Home";
import UserDetails from "./pages/UserDetails";
import Status from "./pages/statusSection/Status";
import Settings from "./pages/settingSection/Settings";
import useUserStore from "./store/useUserStore";
import { useEffect } from "react";
import { disconnectSocket, initailizeSocket } from "./services/chatService";
import { useChatStore } from "./store/chatStore";

function App() {
  const { user } = useUserStore();
  const { setCurrentUser, cleanup } = useChatStore();

  useEffect(() => {
    if (user?._id) {
      const socket = initailizeSocket();

      if (socket) {
        setCurrentUser(user);
      }
    }

    return () => {
      cleanup();
      disconnectSocket();
    };
  }, [user, setCurrentUser, cleanup]);

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/user-login" element={<Login />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/user-profile" element={<UserDetails />} />
          <Route path="/status" element={<Status />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
