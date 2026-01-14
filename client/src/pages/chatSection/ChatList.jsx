import { useState, useEffect } from "react";
import useLayoutStore from "../../store/layoutStore";
import useThemeStore from "../../store/themeStore";
import useUserStore from "../../store/useUserStore";
import { FaPlus, FaSearch } from "react-icons/fa";
import { motion } from "framer-motion";
import formatTimestamp from "../../utils/formatTime";
import { useChatStore } from "../../store/chatStore";
const ChatList = ({ contacts }) => {
  const selectedContact = useLayoutStore((state) => state.selectedContact);
  const setSelectedContact = useLayoutStore(
    (state) => state.setSelectedContact
  );

  const { theme } = useThemeStore();
  const [searchTerm, setSearchTerm] = useState("");
  const { user } = useUserStore();
  const fetchCoversations = useChatStore((s) => s.fetchCoversations);
  const fiterContacts = contacts.filter((contact) =>
    contact?.userName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const backUserPic =
    "https://img.freepik.com/free-vector/user-blue-gradient_78370-4692.jpg?semt=ais_hybrid&w=740&q=80";

  useEffect(() => {
    try {
      fetchCoversations();
    } catch (e) {
      console.error("ChatList: failed to fetch conversations", e);
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div
        className={`w-full border-r-2 h-screen ${
          theme === "dark"
            ? "bg-slate-950 border-gray-800 shadow-lg"
            : "bg-white border-gray-100 shadow-lg"
        }`}
      >
        <div
          className={`p-4 flex justify-between ${
            theme === "dark" ? "text-white" : "text-gray-800"
          }`}
        >
          <h2 className="text-xl font-semibold">Chats</h2>
          <button className="p-2 bg-purple-800 rounded-full cursor-pointer">
            <FaPlus className="transition hover:rotate-180 duration-300 ease-in" />
          </button>
        </div>
        <div className="p-2">
          <div className="relative">
            <FaSearch
              className={`absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400 ${
                theme === "dark" ? "text-gray-400" : "text-gray-800"
              }`}
            />
            <input
              type="text"
              placeholder="Search or start new chat"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full p-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 ${
                theme === "dark"
                  ? "bg-slate-900 text-white border-gray-800 placeholder:text-gray-500"
                  : "bg-gray-100 text-gray-800 border-gray-300 shadow-lg placeholder:text-gray-400"
              }`}
            />
          </div>
        </div>
        <div className="overflow-y-auto h-[cal(120vh-120px)]">
          {/* Ensure conversations and socket listeners are initialized so real-time updates work */}
          {/* fetchCoversations is idempotent and also initializes socket listeners in the store */}
          {useEffect(() => {
            try {
              fetchCoversations();
            } catch (e) {
              console.error("ChatList: failed to fetch conversations", e);
            }
            // run once on mount
            // eslint-disable-next-line react-hooks/exhaustive-deps
          }, [])}
          {fiterContacts.map((contact) => (
            <motion.div
              key={contact?._id}
              onClick={() => setSelectedContact(contact)}
              className={`p-3 flex items-center cursor-pointer  ${
                theme === "dark"
                  ? selectedContact?._id === contact._id
                    ? "bg-gray-700 hover:bg-gray-800 transition duration-300 ease-in"
                    : "hover:bg-gray-800"
                  : selectedContact?._id === contact._id
                  ? "bg-gray-200 hover:bg-gray-300 transition duration-300 ease-in"
                  : "hover:bg-gray-100"
              }`}
            >
              <img
                src={contact?.profilePicture || backUserPic}
                alt={contact?.userName}
                className="w-12 h-12 rounded-full"
              />
              <div className="ml-3 flex-1">
                <div className="flex justify-between items-baseline">
                  <h2
                    className={`font-semibold ${
                      theme === "dark" ? "text-white" : "text-gray-800"
                    }  `}
                  >
                    {contact?.userName}
                  </h2>
                  {contact?.conversation && (
                    <span
                      className={`text-xs ${
                        theme === "dark" ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      {contact?.conversation?.lastMessage?.createdAt
                        ? formatTimestamp(
                            contact.conversation.lastMessage.createdAt
                          )
                        : ""}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-baseline">
                  <p
                    className={`text-sm ${
                      theme === "dark" ? "text-gray-300" : "text-gray-500"
                    } truncate`}
                  >
                    {contact?.conversation?.lastMessage?.content}
                  </p>
                  {contact?.conversation &&
                    Number(contact.conversation.unreadCount || 0) > 0 && (
                      <p
                        className={`text-sm font-semibold w-6 h-6 flex items-center justify-center bg-yellow-500 ${
                          theme === "dark" ? "text-gray-800" : "text-gray-500"
                        } rounded-full`}
                      >
                        {Number(contact.conversation.unreadCount || 0)}
                      </p>
                    )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </>
  );
};

export default ChatList;
