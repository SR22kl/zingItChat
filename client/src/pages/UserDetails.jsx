import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  FaCamera,
  FaCheck,
  FaPenAlt,
  FaPencilAlt,
  FaRegSave,
  FaSmile,
  FaTimes,
} from "react-icons/fa";
import { MdCancel } from "react-icons/md";
import { toast } from "react-toastify";
import Layout from "../components/Layout";
import { updateProfile } from "../services/userServices";
import useThemeStore from "../store/themeStore";
import useUserStore from "../store/useUserStore";
import EmojiPicker from "emoji-picker-react";
import { GiCrossMark } from "react-icons/gi";

const UserDetails = () => {
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [preview, setPreview] = useState(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [showNameEmoji, setShowNameEmoji] = useState(false);
  const [showAboutEmoji, setShowAboutEmoji] = useState(false);
  const [imageUplaoding, setImageUplaoding] = useState(false);

  const { user, setUser } = useUserStore();
  const { theme } = useThemeStore();

  useEffect(() => {
    if (user) {
      setName(user.userName || "");
      setAbout(user.about || "");
    }
  }, [user]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePicture(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (field) => {
    try {
      setImageUplaoding(true);
      const formData = new FormData();

      if (field === "name") {
        formData.append("userName", name);
        setIsEditingName(false);
        setShowNameEmoji(false);
      } else if (field === "about") {
        formData.append("about", about);
        setIsEditingAbout(false);
        setShowAboutEmoji(false);
      }

      if (profilePicture && field === "profile") {
        formData.append("media", profilePicture);
      }
      const updated = await updateProfile(formData);
      setUser(updated.data);
      setProfilePicture(null);
      setPreview(null);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile");
    } finally {
      setImageUplaoding(false);
    }
  };

  const handleEmojiSelect = (emoji, field) => {
    if (field === "name") {
      setName((prev) => prev + emoji.emoji);
      setShowNameEmoji(false);
    } else {
      setAbout((prev) => prev + emoji.emoji);
      setShowAboutEmoji(false);
    }
  };

  return (
    <>
      <Layout>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className={`w-full min-h-screen flex border-r shadow-lg ${
            theme === "dark" ? "bg-slate-950 border-gray-700" : "bg-white"
          }`}
        >
          <div className="w-full rounded-lg p-6">
            <div className=" flex items-center mb-6">
              <h1 className="text-2xl font-bold">Profile</h1>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col items-center">
                <div className=" relative group">
                  <img
                    src={preview || user?.profilePicture}
                    alt="profilePicture"
                    className="w-42 h-42 rounded-full mb-2 object-cover"
                  />
                  <label
                    htmlFor="profileUpload"
                    className=" absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity duration-300 ease-in-out"
                  >
                    <div className="text-white text-center">
                      <FaCamera className=" h-8 w-8 mx-auto mb-1" />
                      <span>Change</span>
                    </div>
                    <input
                      type="file"
                      id="profileUpload"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              {preview && (
                <div className=" flex justify-center gap-4 mt-4">
                  <button
                    onClick={() => {
                      handleSave("profile");
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md cursor-pointer"
                    disabled={imageUplaoding}
                  >
                    {!imageUplaoding ? "Uploading..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setProfilePicture(null);
                      setPreview(null);
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md cursor-pointer"
                  >
                    Discard
                  </button>
                </div>
              )}

              <div
                className={` relative p-4 ${
                  theme === "dark"
                    ? "bg-slate-900 border-gray-700"
                    : "bg-white border-gray-100"
                } shadow-sm rounded-lg`}
              >
                <label
                  htmlFor="name"
                  className="block text-sm font-medium mb-1 text-start text-gray-500"
                >
                  Your Name
                </label>
                <div className="flex items-center">
                  {isEditingName ? (
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full px-3 py-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        theme === "dark"
                          ? "bg-slate-950 text-white"
                          : "bg-white text-black"
                      }`}
                    />
                  ) : (
                    <span className="w-full px-3 py-3">
                      {user?.userName || name}
                    </span>
                  )}

                  {isEditingName ? (
                    <>
                      <button
                        onClick={() => {
                          handleSave("name");
                        }}
                        className="ml-2 focus:outline-none cursor-pointer"
                        disabled={imageUplaoding}
                      >
                        <FaRegSave className=" h-5 w-5 text-green-500 hover:text-green-600" />
                      </button>
                      <button
                        onClick={() => {
                          setShowNameEmoji(!showNameEmoji);
                        }}
                        className="ml-2 focus:outline-none cursor-pointer"
                        disabled={imageUplaoding}
                      >
                        <FaSmile className=" h-5 w-5 text-yellow-500 hover:text-yellow-600" />
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingName(false);
                          setShowNameEmoji(false);
                        }}
                        className="ml-2 focus:outline-none cursor-pointer"
                      >
                        <MdCancel className=" h-6 w-6 text-red-500 hover:text-red-600" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setIsEditingName(!isEditingName);
                        }}
                        className=" ml-2 focus:outline-none cursor-pointer"
                      >
                        <FaPencilAlt className=" h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
                {showNameEmoji && (
                  <div className=" absolute z-10 -top-65">
                    <EmojiPicker
                      onEmojiClick={(emoji) => handleEmojiSelect(emoji, "name")}
                      theme={theme === "dark" ? "dark" : "light"}
                    />
                    <button
                      onClick={() => setShowNameEmoji(false)}
                      className=" absolute top-2 right-2 text-gray-400 hover:text-gray-500"
                    >
                      <GiCrossMark />
                    </button>
                  </div>
                )}
              </div>

              <div
                className={` relative p-4 ${
                  theme === "dark"
                    ? "bg-slate-900 border-gray-700"
                    : "bg-white border-gray-100"
                } shadow-sm rounded-lg`}
              >
                <label
                  htmlFor="about"
                  className="block text-sm font-medium mb-1 text-start text-gray-500"
                >
                  About
                </label>
                <div className="flex items-center">
                  {isEditingAbout ? (
                    <input
                      type="text"
                      id="about"
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      className={`w-full px-3 py-2 border border-gray-500 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        theme === "dark"
                          ? "bg-slate-950 text-white"
                          : "bg-white text-black"
                      }`}
                    />
                  ) : (
                    <span className="w-full px-3 py-3">
                      {user?.about || about}
                    </span>
                  )}

                  {isEditingAbout ? (
                    <>
                      <button
                        onClick={() => {
                          handleSave("about");
                        }}
                        className="ml-2 focus:outline-none cursor-pointer"
                        disabled={imageUplaoding}
                      >
                        <FaRegSave className=" h-5 w-5 text-green-500 hover:text-green-600" />
                      </button>
                      <button
                        onClick={() => {
                          setShowAboutEmoji(!showAboutEmoji);
                        }}
                        className="ml-2 focus:outline-none cursor-pointer"
                        disabled={imageUplaoding}
                      >
                        <FaSmile className=" h-5 w-5 text-yellow-500 hover:text-yellow-600" />
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingAbout(false);
                          setShowAboutEmoji(false);
                        }}
                        className="ml-2 focus:outline-none cursor-pointer"
                      >
                        <MdCancel className=" h-6 w-6 text-red-500 hover:text-red-600" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setIsEditingAbout(!isEditingAbout);
                        }}
                        className=" ml-2 focus:outline-none cursor-pointer"
                      >
                        <FaPencilAlt className=" h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
                {showAboutEmoji && (
                  <div className=" absolute z-10 -top-65">
                    <EmojiPicker
                      onEmojiClick={(emoji) =>
                        handleEmojiSelect(emoji, "about")
                      }
                      theme={theme === "dark" ? "dark" : "light"}
                    />
                    <button
                      onClick={() => setShowAboutEmoji(false)}
                      className=" absolute top-2 right-2 text-gray-400 hover:text-gray-500"
                    >
                      <GiCrossMark />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </Layout>
    </>
  );
};

export default UserDetails;
