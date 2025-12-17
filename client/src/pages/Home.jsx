import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getAllUsers } from "../services/userServices";
import ChatList from "./chatSection/ChatList";

const Home = () => {
  const [allUsers, setAllUsers] = useState([]);
  const getUser = async () => {
    try {
      const results = await getAllUsers();
      if (results.status === "success") {
        setAllUsers(results.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getUser();
  }, []);

  // console.log(allUsers);

  return (
    <>
      <Layout>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="h-full"
        >
          <ChatList contacts={allUsers} />
        </motion.div>
      </Layout>
    </>
  );
};

export default Home;
