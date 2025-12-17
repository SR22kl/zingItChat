import twilio from "twilio";

// Twilio credentials from env
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const serviceSid = process.env.TWILIO_SERVICE_SID;

const client = twilio(accountSid, authToken);

//send OTP to Phone Number
const sendOtpToPhoneNumber = async (phoneNumber) => {
  try {
    console.log("sending otp to this number", phoneNumber);
    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }
    const response = await client.verify.v2
      .services(serviceSid)
      .verifications.create({
        to: phoneNumber,
        channel: "sms",
      });
    console.log("This is my otp response", response);
    return response;
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw new Error("Failed to send OTP");
  }
};

const verifyOtp = async (phoneNumber, otp) => {
  try {
    console.log("sending otp to this number", phoneNumber);
    console.log("This is my otp", otp);

    const response = await client.verify.v2
      .services(serviceSid)
      .verificationChecks.create({
        to: phoneNumber,
        code: otp,
      });
    console.log("This is my OTP response", response);
    return response;
  } catch (error) {
    console.error("Error verifying OTP:", error);
    throw new Error("Failed to verify OTP");
  }
};

export default {
  sendOtpToPhoneNumber,
  verifyOtp,
};
