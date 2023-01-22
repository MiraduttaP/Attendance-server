import express from "express";
import multer from "multer";
import {
  getEmployees,
  getEmployee,
  addEmployee,
  checkInAttendance,
  checkOutAttendance,
  attendanceStatus,
} from "./database.js";

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import dotenv from "dotenv";

dotenv.config();

const bucketName = process.env.BUCKET_NAME;
const bucketRegion = process.env.BUCKET_REGION;
const accessKey = process.env.ACCESS_KEY;
const secretAccessKey = process.env.SECRET_ACCESS_KEY;
const bucketEndpoint = process.env.BUCKET_ENDPOINT;

const s3 = new S3Client({
  credentials: {
    accessKeyId: accessKey,
    secretAccessKey: secretAccessKey,
  },
  region: bucketRegion,
  endpoint: bucketEndpoint,
});

const app = express();

app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.get("/employees", async (req, res) => {
  const employees = await getEmployees();
  res.send(employees);
});

app.get("/employees/:id", async (req, res) => {
  const emp_id = req.params.id;
  const employee = await getEmployee(emp_id);
  res.send(employee);
});

app.post("/employees", async (req, res) => {
  const { emp_name } = req.body;
  const employee = await addEmployee(emp_name);
  res.status(201).send(employee);
});

app.post("/status", upload.single("file"), async (req, res) => {
  // console.log("req.body", req.body);
  // console.log("req.file", req.file);

  const { emp_id, office, time } = req.body;

  req.file.buffer;

  const params = {
    Bucket: bucketName,
    Key: req.file.originalname,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
  };

  const command = new PutObjectCommand(params);

  await s3.send(command);

  const getStatus = await attendanceStatus(emp_id);

  let result;
  let message = "";
  if (getStatus[0].emp_status == 0) {
    result = await checkInAttendance(
      emp_id,
      office,
      time,
      req.file.originalname
    );
    message = "Checked in sucessful";
  } else if (getStatus[0].emp_status == 1) {
    result = await checkOutAttendance(
      emp_id,
      office,
      time,
      req.file.originalname
    );
    message = "Checked out sucessful";
  }

  res.status(201).send({ message: message });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

app.listen(8080, () => {
  console.log("Server is running on port 8080");
});

// LOCAL STORAGE CODE
//
// const storage = multer.diskStorage({
//   destination(req, file, callback) {
//     callback(null, "./images/");
//   },
//   filename(req, file, callback) {
//     callback(null, `${file.fieldname}_${Date.now()}_${file.originalname}`);
//   },
// });

// TO GET IMAGE URL

// app.get("/allattendance", async (req, res) => {
//   const attendance = await getAllAttendance();

//   for (const row of attendance) {
//     const getObjectParams = {
//       Bucket: bucketName,
//       Key: row.imageName,
//     };
//     const command = new GetObjectCommand(getObjectParams);
//     const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
//     attendance.imageUrl = url;
//   }
//   res.send(attendance);
// });

// app.post("/checkout", upload.single("file"), async (req, res) => {
//   console.log("req.body", req.body);
//   console.log("req.file", req.file);

//   const { emp_id, check_out_office, check_out_time } = req.body;

//   req.file.buffer;

//   const params = {
//     Bucket: bucketName,
//     Key: req.file.originalname,
//     Body: req.file.buffer,
//     ContentType: req.file.mimetype,
//   };

//   const command = new PutObjectCommand(params);

//   await s3.send(command);

//   const result = await checkOutAttendance(
//     emp_id,
//     check_out_office,
//     check_out_time,
//     req.file.originalname
//   );

//   res.send(result);
// });
