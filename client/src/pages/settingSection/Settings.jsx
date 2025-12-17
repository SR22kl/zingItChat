import { useState } from "react";
import {
  FaComment,
  FaMoon,
  FaQuestionCircle,
  FaSearch,
  FaSignInAlt,
  FaSun,
  FaUser,
} from "react-icons/fa";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import Layout from "../../components/Layout";
import { logOutUser } from "../../services/userServices";
import useThemeStore from "../../store/themeStore";
import useUserStore from "../../store/useUserStore";
import useLoginStore from "../../store/useLoginStore";

const Settings = () => {
  const [isThemeDialogueOpen, setIsThemeDialogueOpen] = useState(false);
  const { restLoginState } = useLoginStore();
  const { theme } = useThemeStore();
  const { user, clearUser } = useUserStore();

  const backUserPic =
    "https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg?semt=ais_hybrid&w=740&q=80";

  const toggleThemeDialogue = () => {
    setIsThemeDialogueOpen(!isThemeDialogueOpen);
  };

  const handleLogout = async () => {
    try {
      await logOutUser();
      clearUser();
      restLoginState();
      toast.success("User logout successfully");
    } catch (error) {
      console.error("Failed to log out user", error);
    }
  };

  return (
    <>
      <Layout
        isThemeDialogOpen={isThemeDialogueOpen}
        tooggleThemeDialog={toggleThemeDialogue}
      >
        <div
          className={` flex h-screen ${
            theme === "dark"
              ? "bg-slate-950 text-white"
              : "bg-white text-gray-800"
          }`}
        >
          <div
            className={`w-full border-r-2 ${
              theme === "dark"
                ? "bg-slate-950 border-gray-800 shadow-lg"
                : "bg-white border-gray-200 shadow-lg"
            }`}
          >
            <div className="p-4">
              <h1 className="text-xl font-semibold mb-4">Settings</h1>
              <div className="relative mb-4">
                <FaSearch
                  className={`absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-800"
                  }`}
                />
                <input
                  type="text"
                  placeholder="Search Settings"
                  className={`w-full p-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 ${
                    theme === "dark"
                      ? "bg-slate-900 text-white border-gray-800 placeholder:text-gray-500"
                      : "bg-gray-100 text-gray-800 border-gray-300 shadow-lg placeholder:text-gray-400"
                  }`}
                />
              </div>

              <div
                className={`flex items-center gap-4 p-3 ${
                  theme === "dark" ? "hover:bg-slate-900" : "hover:bg-gray-100"
                } cursor-pointer mb-4 rounded-md`}
              >
                <img
                  src={user?.profilePicture || backUserPic}
                  alt="profile"
                  className="w-14 h-14 rounded-full"
                />
                <div>
                  <h2 className="font-semibold">{user?.userName}</h2>
                  <p className="text-gray-600 text-sm">{user?.about}</p>
                </div>
              </div>

              {/* menu-items  */}
              <div className="h-[cal-100vh-280px] overflow-y-auto">
                <div className="space-y-1">
                  {[
                    { icon: FaUser, lable: "Account", href: "/user-profile" },
                    { icon: FaComment, lable: "Chats", href: "/" },
                    { icon: FaQuestionCircle, lable: "Help", href: "/help" },
                  ].map((item) => (
                    <Link
                      to={item.href}
                      key={item.lable}
                      className={`w-full flex items-center gap-3 p-2 rounded ${
                        theme === "dark"
                          ? "hover:bg-slate-900 text-gray-200"
                          : "hover:bg-gray-100 text-gray-800"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <div
                        className={`border-b ${
                          theme === "dark"
                            ? "border-gray-800"
                            : "border-gray-200"
                        } w-full p-4`}
                      >
                        {item.lable}
                      </div>
                    </Link>
                  ))}

                  {/* Theme button */}
                  <button
                    onClick={toggleThemeDialogue}
                    className={`w-full flex items-center gap-3 p-2 ruonded ${
                      theme === "dark"
                        ? "hover:bg-slate-900 text-gray-200"
                        : "hover:bg-gray-200 text-gray-800"
                    }`}
                  >
                    {theme === "dark" ? (
                      <FaMoon className="relative w-5 h-5 -top-2" />
                    ) : (
                      <FaSun className="relative w-5 h-5 -top-2" />
                    )}
                    <div
                      className={`flex flex-col text-start border-b w-full p-2 ${
                        theme === "dark" ? "border-gray-800" : "border-gray-300"
                      }`}
                    >
                      Theme
                      <span className="ml-auto text-sm text-gray-600">
                        {theme.charAt(0).toUpperCase() + theme.slice(1)}
                      </span>
                    </div>
                  </button>
                </div>

                {/* logOut button */}
                <button
                  className={`w-full flex items-center gap-3 p-2 rounded ${
                    theme === "dark"
                      ? "hover:bg-slate-900 text-gray-200"
                      : "hover:bg-gray-200 text-gray-800"
                  } mt-10 md:mt-25`}
                  onClick={handleLogout}
                >
                  <FaSignInAlt className="w-5 h-5" /> Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default Settings;
