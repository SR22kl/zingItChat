import { motion } from "framer-motion";
import { RiChatSmileAiLine } from "react-icons/ri";

export default function Loader({ progress = 0 }) {
  return (
    <div className="fixed inset-0 bg-linear-to-br from-purple-400 via-violet-500 to-pink-500 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          duration: 0.8,
          type: "spring",
          stiffness: 200,
          damping: 15,
        }}
        className="w-28 h-28 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mb-8 shadow-2xl border border-white/30"
        style={{
          boxShadow:
            "0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <RiChatSmileAiLine className="w-16 h-16 text-white drop-shadow-lg" />
        </motion.div>
      </motion.div>
      <div className="w-72 bg-white/20 backdrop-blur-md rounded-full h-3 mb-6 shadow-inner border border-white/30 overflow-hidden">
        <motion.div
          className="bg-linear-to-r from-white to-purple-200 h-full rounded-full shadow-lg"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{
            background:
              "linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(147,51,234,1) 100%)",
            boxShadow: "0 0 10px rgba(147, 51, 234, 0.5)",
          }}
        >
          <motion.div
            className="w-full h-full bg-white/50 rounded-full"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </div>
      <motion.p
        className="text-white text-xl font-bold drop-shadow-lg"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        Loading... {progress}%
      </motion.p>
    </div>
  );
}
