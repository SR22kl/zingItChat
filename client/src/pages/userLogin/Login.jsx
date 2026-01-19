import { useState } from "react";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import useLoginStore from "../../store/useLoginStore.js";
import countries from "../../utils/countries.js";
import { useNavigate } from "react-router-dom";
import useUserStore from "../../store/useUserStore.js";
import { useForm } from "react-hook-form";
import useThemeStore from "../../store/themeStore.js";
import { motion } from "framer-motion";
import { RiChatSmileAiLine } from "react-icons/ri";
import { FaArrowLeft, FaChevronDown, FaPlus, FaUser } from "react-icons/fa";
import Spinner from "../../utils/Spinner.jsx";
import {
  sendOtp,
  updateProfile,
  verifyOtp,
} from "../../services/userServices.js";
import { toast } from "react-toastify";

// validation schema
const loginValidationSchema = yup
  .object()
  .shape({
    phoneNumber: yup
      .string()
      .nullable()
      .notRequired()
      .matches(/^\d+$/, "Phone number must be digits only")
      .transform((value, originalValue) => {
        return originalValue.trim() === "" ? null : value;
      }),
    email: yup
      .string()
      .nullable()
      .notRequired()
      .email("Invalid email, please enter a valid email")
      .transform((value, originalValue) => {
        return originalValue.trim() === "" ? null : value;
      }),
  })
  .test(
    "at-least-one",
    "Either email or phone number is required",
    function (value) {
      return !!(value.phoneNumber || value.email);
    }
  );

const otpValidationSchema = yup.object().shape({
  otp: yup
    .string()
    .required("OTP is required")
    .length(6, "OTP must be 6 digits")
    .matches(/^[0-9]+$/, "OTP must contain only digits"),
});

const profileValidationSchema = yup.object().shape({
  userName: yup.string().required("User name is required"),
  agreed: yup
    .bool()
    .oneOf([true], "You must agree to the terms and conditions"),
});

const avatars = [
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Felix",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Aneka",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Mimi",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Jasper",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Luna",
  "https://api.dicebear.com/6.x/avataaars/svg?seed=Zoe",
];

const Login = () => {
  const { step, setStep, userPhoneData, setUserPhoneData, restLoginState } =
    useLoginStore();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [selectAvatar, setSelectAvatar] = useState(avatars[0]);
  const [error, setError] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useUserStore();
  const { theme, setTheme } = useThemeStore();

  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm({
    resolver: yupResolver(loginValidationSchema),
  });

  const {
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
    setValue: setOtpValue,
  } = useForm({
    resolver: yupResolver(otpValidationSchema),
  });

  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    watch,
  } = useForm({
    resolver: yupResolver(profileValidationSchema),
  });

  const filterCountries = countries.filter((country) => {
    return (
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.dialCode.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const onLoginSubmit = async () => {
    try {
      setLoading(true);
      if (email) {
        const response = await sendOtp(null, null, email);
        if (response.status === "success") {
          toast.info("OTP sent to your email");
          setUserPhoneData({ email });
          setStep(2);
        }
      } else {
        const response = await sendOtp(phoneNumber, selectedCountry.dialCode);
        if (response.status === "success") {
          toast.info("OTP sent to your phone number");
          setUserPhoneData({
            phoneNumber,
            phoneSuffix: selectedCountry.dialCode,
          });
          setStep(2);
        }
      }
    } catch (error) {
      console.log(error);
      setError(error.message || "Failed to send OTP");
      toast.error(error.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const onOtpSubmit = async () => {
    try {
      setLoading(true);
      if (!userPhoneData) {
        throw new Error("Phone number or email is required!");
      }
      const otpString = otp.join("");
      let response;
      if (userPhoneData?.email) {
        response = await verifyOtp(null, null, userPhoneData.email, otpString);
      } else {
        response = await verifyOtp(
          userPhoneData.phoneNumber,
          userPhoneData.phoneSuffix,
          null,
          otpString
        );
      }
      // console.log("verifyOtp response:", response);
      if (response.status === "success") {
        toast.success("OTP verified successfully");
        const token = response?.data?.token;
        localStorage.setItem("auth_token", token);
        const user = response?.data?.user;
        // console.log("verified user object:", user);
        // If the user has a username we treat this as an existing account.
        // If profilePicture is missing, provide a default avatar and still log them in.
        if (user?.userName) {
          const safeUser = {
            ...user,
            profilePicture: user.profilePicture || selectAvatar || avatars[0],
          };
          setUser(safeUser);
          toast.success("Welcome Back! just ZingIT ");
          navigate("/");
          restLoginState();
        } else {
          // No username yet — send user to profile creation step
          setStep(3);
        }
      }
    } catch (error) {
      console.log(error);
      setError(error.message || "Failed to verify OTP");
      toast.error(error.message || "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePictureFile(file);
      setProfilePicture(URL.createObjectURL(file));
    }
  };

  const onProfileSubmit = async (data) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("userName", data.userName);
      formData.append("agreed", data.agreed);
      if (profilePictureFile) {
        formData.append("media", profilePictureFile);
      } else {
        formData.append("profilePicture", selectAvatar);
      }
      await updateProfile(formData);
      toast.success("Profile updated successfully");
      navigate("/");
      restLoginState();
    } catch (error) {
      console.log(error);
      setError(error.message || "Failed to update user profile");
      toast.error(error.message || "Failed to update user profile");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChanage = (index, value) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpValue("otp", newOtp.join(""));
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleBack = () => {
    setStep(1);
    setUserPhoneData(null);
    setOtp(["", "", "", "", "", ""]);
    setError("");
  };

  const ProgressBar = ({ theme, step }) => {
    return (
      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.5 }}
        className={`w-full ${
          theme === "dark" ? "bg-gray-700/50" : "bg-gray-200/50"
        } rounded-full h-3 mb-6 backdrop-blur-sm border border-white/10 overflow-hidden`}
      >
        <motion.div
          className="bg-linear-to-r from-purple-500 to-pink-500 h-full rounded-full shadow-lg"
          initial={{ width: 0 }}
          animate={{ width: `${(step / 3) * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            boxShadow: "0 0 10px rgba(147, 51, 234, 0.5)",
          }}
        >
          <motion.div
            className="w-full h-full bg-white/30 rounded-full"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>
    );
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="min-h-screen bg-linear-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center font-sans overflow-hidden relative"
      >
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-300/20 rounded-full blur-3xl"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className={`${
            theme === "dark" ? "bg-slate-900/90" : "bg-white/90"
          } w-full max-w-md rounded-3xl shadow-2xl p-8 md:p-10 relative z-10 backdrop-blur-xl border border-white/20`}
          style={{
            boxShadow:
              "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.05)",
          }}
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              duration: 0.8,
              type: "spring",
              stiffness: 200,
              damping: 15,
              delay: 0.5,
            }}
            className="w-28 h-28 bg-linear-to-br from-purple-500 to-pink-500 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <RiChatSmileAiLine className="w-16 h-16 text-white drop-shadow-lg" />
            </motion.div>
          </motion.div>

          <h1
            className={`${
              theme === "dark" ? "text-gray-300" : "text-gray-800"
            } text-2xl font-bold text-center mb-6`}
          >
            zingIT Login
          </h1>

          <ProgressBar theme={theme} step={step} />

          {error && <a className="text-red-500 text-center mb-4">{error}</a>}
          {/* step-1 */}
          {step === 1 && (
            <form
              className="space-y-4"
              onSubmit={handleLoginSubmit(onLoginSubmit)}
            >
              <p
                className={
                  theme === "dark"
                    ? "text-gray-300"
                    : "text-gray-800 text-center mb-4"
                }
              >
                Enter your phone number
              </p>

              <div className="relative">
                <div className="flex">
                  <div className="relative w-1/3">
                    <button
                      type="button"
                      onClick={() => setShowDropdown(!showDropdown)}
                      className={`shrink-0 z-10 inline-flex items-center py-2.5 px-4 text-sm font-medium text-center ${
                        theme === "dark"
                          ? "text-gray-300 bg-purple-600 border-gray-600"
                          : "text-gray-800 bg-gray-200 border-gray-300"
                      } border rounded-s-lg hover:bg-purple-700 focus:ring-4 outline-none focus:ring-gray-300`}
                    >
                      <span className="flex">
                        <img
                          src={selectedCountry.flag}
                          alt=""
                          style={{ width: 20, height: 20, marginRight: 10 }}
                        />{" "}
                        {selectedCountry.dialCode}
                      </span>
                      <FaChevronDown className="ml-2" />
                    </button>
                    {showDropdown && (
                      <div
                        className={`absolute w-full z-20 mt-1 ${
                          theme === "dark"
                            ? "bg-purple-800 border-purple-900"
                            : "bg-white border-gray-300"
                        } border rounded-md shadow-lg max-h-60 overflow-auto`}
                      >
                        <div
                          className={`sticky top-0  ${
                            theme === "dark" ? "bg-purple-800" : "bg-gray-200"
                          } py-2 px-2`}
                        >
                          <input
                            type="text"
                            placeholder="Search Countries..."
                            className={`w-full px-2 py-1 border ${
                              theme === "dark"
                                ? "bg-purple-900 text-gray-200 border-purple-900"
                                : "bg-white border-gray-300 text-gray-800"
                            } border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-400`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                        {filterCountries.map((country) => (
                          <button
                            key={country.alpha2}
                            type="button"
                            className={`w-full text-left px-3 py-2 flex ${
                              theme === "dark"
                                ? "bg-purple-900 text-gray-200 border-purple-900"
                                : "bg-white text-gray-800 border-gray-300"
                            }`}
                            onClick={() => {
                              setSelectedCountry(country);
                              setShowDropdown(false);
                            }}
                          >
                            <span className="flex">
                              <img
                                src={country.flag}
                                alt=""
                                style={{
                                  width: 20,
                                  height: 20,
                                  marginRight: 10,
                                }}
                              />
                              <p className="text-[12px] truncate">
                                {country.dialCode} {country.name.slice(0, 8)}
                              </p>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    {...loginRegister("phoneNumber")}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Phone Number"
                    className={`shrink-0 z-10 inline-flex items-center py-2.5 px-4 text-sm font-medium text-center ${
                      theme === "dark"
                        ? "text-gray-200 bg-purple-600 border-gray-600"
                        : "text-gray-800 bg-gray-200 border-gray-300"
                    } border rounded-r-lg hover:bg-purple-700 focus:ring-4 outline-none focus:ring-gray-300 ${
                      loginErrors.phoneNumber ? "border-red-500" : ""
                    }`}
                  />
                </div>
                {loginErrors.phoneNumber && (
                  <p className="text-red-500 text-xs mt-1">
                    {loginErrors.phoneNumber.message}
                  </p>
                )}
              </div>
              {/* divider with or */}
              <div className="flex items-center justify-center">
                <div className="w-full h-px bg-gray-500"></div>
                <span className="px-4 text-gray-500">or</span>
                <div className="w-full h-px bg-gray-500"></div>
              </div>

              {/* Email input box */}
              <div
                className={`flex items-center border rounded-md px-3 py-2 mb-4 ${
                  theme === "dark"
                    ? "text-gray-200 bg-purple-700 border-purple-600"
                    : "text-gray-800 bg-gray-200 border-gray-300"
                }`}
              >
                <FaUser />
                <input
                  type="email"
                  {...loginRegister("email")}
                  placeholder="Email (Optional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-2/3 px-4 py-1 font-medium bg-transparent ${
                    theme === "dark"
                      ? "text-gray-200"
                      : "text-gray-800 bg-gray-200 border-gray-300"
                  } ${loginErrors.email ? "border-red-500" : ""} outline-none`}
                />
                {loginErrors.email && (
                  <p className="text-red-500 text-xs mt-1">
                    {loginErrors.email.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 mt-4 text-sm font-medium text-center text-white transition duration-300 ease-in-out 
                bg-linear-to-br from-indigo-600 to-blue-500 hover:opacity-90 rounded-lg focus:ring-4 focus:outline-none focus:ring-blue-300"
              >
                {loading ? <Spinner size="small" color="dark" /> : "Send OTP"}
              </button>
            </form>
          )}
          {/* step-2 */}
          {step === 2 && (
            <form onSubmit={handleOtpSubmit(onOtpSubmit)} className="space-y-4">
              <p
                className={`text-center ${
                  theme === "dark" ? "text-gray-200" : "text-gray-800"
                }`}
              >
                Please enter the 6-digit OTP sent to your{" "}
                {userPhoneData?.email ? (
                  <>
                    email{" "}
                    <span className="font-semibold">{userPhoneData.email}</span>
                  </>
                ) : (
                  <>
                    phone number{" "}
                    <span className="font-semibold">
                      {userPhoneData?.phoneSuffix}
                      {userPhoneData?.phoneNumber}
                    </span>
                  </>
                )}
              </p>
              <div className="flex justify-between">
                {otp.map((digit, index) => (
                  <input
                    type="text"
                    key={index}
                    id={`otp-${index}`}
                    value={digit}
                    onChange={(e) => handleOtpChanage(index, e.target.value)}
                    className={`w-12 h-12 text-center border ${
                      theme === "dark"
                        ? "bg-purple-800 border-purple-700 text-gray-200"
                        : "bg-white text-gray-800 border-gray-300"
                    } rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      otpErrors.otp ? "border-red-500" : ""
                    }`}
                  />
                ))}
              </div>
              {otpErrors.otp && (
                <p className="text-red-500 text-xs mt-1">
                  {otpErrors.otp.message}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 mt-4 text-sm font-medium text-center text-white transition duration-300 ease-in-out 
                bg-linear-to-br from-indigo-600 to-blue-500 hover:opacity-90 rounded-lg focus:ring-4 focus:outline-none focus:ring-blue-300"
              >
                {loading ? <Spinner size="small" color="dark" /> : "Verify OTP"}
              </button>

              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleBack}
                  className={`rounded-full mt-2 w-10 h-10 shadow-lg flex items-center justify-center ${
                    theme === "dark"
                      ? "bg-purple-700 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  <FaArrowLeft className="transition hover:-translate-x-1.5 duration-300 ease-in-out" />
                </button>
                <p
                  className={`text-center ml-2 ${
                    theme === "dark" ? "text-gray-200" : "text-gray-800"
                  }`}
                >
                  OTP Expired? Go Back
                </p>
              </div>
            </form>
          )}
          {/* step-3 */}
          {step === 3 && (
            <form
              className="space-y-4"
              onSubmit={handleProfileSubmit(onProfileSubmit)}
            >
              <div className="flex flex-col items-center mb-4">
                <div className="relative w-24 h-24 mb-2">
                  <img
                    src={profilePicture || selectAvatar}
                    alt="profilePicture"
                    className="w-full h-full rounded-full object-cover"
                  />
                  <label
                    htmlFor="profilePicture"
                    className="absolute bottom-0 right-0 bg-purple-500 text-white p-2 rounded-full cursor-pointer hover:bg-purple-600 duration-300 ease-in-out"
                  >
                    <FaPlus className="w-4 h-4" />
                  </label>
                  <input
                    type="file"
                    id="profilePicture"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-gray-200" : "text-gray-800"
                  }`}
                >
                  Choose an avatar for your profile
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {avatars.map((avatar, index) => (
                    <img
                      key={avatar}
                      src={avatar}
                      alt={`Avatar-${index + 1}`}
                      className={`w-12 h-12 rounded-full cursor-pointer mt-2 hover:scale-110 ${
                        selectAvatar === avatar
                          ? "border-2 border-purple-500"
                          : ""
                      } duration-300 ease-in-out`}
                      onClick={() => setSelectAvatar(avatar)}
                    />
                  ))}
                </div>
              </div>
              <div className="relative">
                <FaUser
                  className={`absolute top-1/2 left-3 transform -translate-y-1/2 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-800"
                  }`}
                />
                <input
                  {...profileRegister("userName")}
                  type="text"
                  placeholder="Username"
                  className={`w-full h-12 pl-10 pr-4 border ${
                    theme === "dark"
                      ? "bg-purple-800 border-purple-700 text-gray-200"
                      : "bg-white border-gray-300"
                  } rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    profileErrors.userName ? "border-red-500" : ""
                  }`}
                />
                {profileErrors.userName && (
                  <p className="text-red-500 text-xs mt-1">
                    {profileErrors.userName.message}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-center space-x-2">
                <input
                  {...profileRegister("agreed")}
                  type="checkbox"
                  className="w-4 h-4 cursor-pointer"
                />
                <label
                  htmlFor="agreed"
                  className={`text-sm ${
                    theme === "dark" ? "text-gray-200" : "text-gray-800"
                  }`}
                >
                  I agree to the{" "}
                  <a className="text-indigo-400 hover:underline" href="#">
                    {" "}
                    Terms & Conditions
                  </a>
                </label>
              </div>
              {profileErrors.agreed && (
                <p className="text-red-500 text-xs mt-1">
                  {profileErrors.agreed.message}
                </p>
              )}
              <button
                type="submit"
                disabled={!watch("agreed") || loading}
                className={`w-full py-3 px-4 mt-1 text-sm font-medium text-center text-white transition duration-300 ease-in-out 
                bg-linear-to-br from-indigo-600 to-blue-500 opacity-90 cursor-pointer hover:opacity-100 rounded-lg focus:ring-4 focus:outline-none focus:ring-blue-300 ${
                  loading ? "cursor-not-allowed opacity-50" : ""
                }`}
              >
                {loading ? (
                  <Spinner size="small" color="dark" />
                ) : (
                  "Create Profile"
                )}
              </button>

              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleBack}
                  className={`rounded-full w-10 h-10 shadow-lg flex items-center justify-center ${
                    theme === "dark"
                      ? "bg-purple-700 text-white"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  <FaArrowLeft className="transition hover:-translate-x-1.5 duration-300 ease-in-out" />
                </button>
                <p
                  className={`text-center ml-2 ${
                    theme === "dark" ? "text-gray-200" : "text-gray-800"
                  }`}
                >
                  Go Back
                </p>
              </div>
            </form>
          )}
        </motion.div>
      </motion.div>
    </>
  );
};

export default Login;
