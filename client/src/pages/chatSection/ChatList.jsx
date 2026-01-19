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
  const conversations = useChatStore((s) => s.conversations);

  // Build filtered contacts from store's conversations for real-time updates
  const fiterContacts = (conversations?.data || [])
    .map((conv) => {
      const otherParticipant = conv.participants?.find(
        (p) => p._id !== user?._id
      );
      if (!otherParticipant) return null;
      return {
        ...otherParticipant,
        conversation: {
          ...conv,
          lastMessage: conv.latestMessage,
          unreadCount: conv.unreadCount,
        },
      };
    })
    .filter(Boolean)
    .filter((contact) =>
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
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`w-full border-r-2 h-screen ${
        theme === "dark"
          ? "bg-slate-900/80 border-gray-700/50 text-white"
          : "bg-white/80 border-gray-200/50 text-black"
      } backdrop-blur-xl shadow-2xl`}
      style={{
        boxShadow: "4px 0 20px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div
        className={`p-6 flex justify-between items-center ${
          theme === "dark" ? "text-white" : "text-gray-800"
        } border-b border-white/10`}
      >
        <motion.h2
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-2xl font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
        >
          Chats
        </motion.h2>
        <motion.button
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          className="p-3 bg-linear-to-r from-purple-500 to-pink-500 rounded-2xl cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <FaPlus className="w-5 h-5 text-white" />
        </motion.button>
      </div>
      <div className="p-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative"
        >
          <FaSearch
            className={`absolute top-1/2 left-4 transform -translate-y-1/2 w-5 h-5 z-50 ${
              theme === "dark" ? "text-gray-500" : "text-gray-500"
            }`}
          />
          <input
            type="text"
            placeholder="Search or start new chat"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full p-4 pl-12 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-300 transition-all duration-300 ${
              theme === "dark"
                ? "bg-slate-800/50 text-white border-gray-600/50 placeholder:text-gray-400 backdrop-blur-sm"
                : "bg-gray-50/50 text-gray-800 border-gray-200/50 placeholder:text-gray-400 backdrop-blur-sm"
            } shadow-lg`}
          />
        </motion.div>
      </div>
      <div className="overflow-y-auto h-[cal(120vh-120px)]">
        {fiterContacts.map((contact, index) => (
          <motion.div
            key={contact?._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            whileHover={{ scale: 1, x: 5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setSelectedContact(contact)}
            className={`p-4 mx-2 my-1 flex items-center cursor-pointer rounded-lg transition-all duration-300 ${
              theme === "dark"
                ? selectedContact?._id === contact._id
                  ? "bg-linear-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 shadow-lg"
                  : "hover:bg-white/5 border border-transparent"
                : selectedContact?._id === contact._id
                  ? "bg-linear-to-r from-purple-100/50 to-pink-100/50 border border-purple-300/50 shadow-lg"
                  : "hover:bg-gray-50/50 border border-transparent"
            } backdrop-blur-md shadow-lg`}
          >
            <motion.img
              src={contact?.profilePicture || backUserPic}
              alt={contact?.userName}
              className="w-14 h-14 rounded-full border-2 border-white/20 shadow-lg"
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300 }}
            />
            <div className="ml-4 flex-1">
              <div className="flex justify-between items-center">
                <h2
                  className={`font-bold text-lg ${
                    theme === "dark" ? "text-white" : "text-gray-800"
                  }`}
                >
                  {contact?.userName}
                </h2>
                {contact?.conversation && (
                  <span
                    className={`text-xs font-medium ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
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
              <div className="flex justify-between items-center mt-1">
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-gray-300" : "text-gray-600"
                  } truncate`}
                >
                  {contact?.conversation?.lastMessage?.content}
                </p>
                {contact?.conversation &&
                  Number(contact.conversation.unreadCount || 0) > 0 && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-7 h-7 flex items-center justify-center bg-linear-to-r from-yellow-400 to-orange-500 text-white rounded-full font-bold text-xs shadow-lg"
                    >
                      {Number(contact.conversation.unreadCount || 0)}
                    </motion.div>
                  )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default ChatList;
