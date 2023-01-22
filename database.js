import mysql from "mysql2";
import dotenv from "dotenv";
import { query } from "express";

dotenv.config();

const pool = mysql
  .createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  })
  .promise();

export async function getEmployees() {
  const [rows] = await pool.query(
    `SELECT emp_id,
    emp_name,
    emp_status
    FROM tbl_employee`
  );
  return rows;
}

export async function getEmployee(emp_id) {
  const [rows] = await pool.query(
    `SELECT emp_id,
    emp_name,
    emp_status
  FROM tbl_employee 
  WHERE emp_id = ?`,
    [emp_id]
  );
  return rows[0];
}

export async function addEmployee(emp_name) {
  const [result] = await pool.query(
    `
    INSERT INTO tbl_employee (emp_name)
    VALUES (?)
    `,
    [emp_name]
  );
  const emp_id = result.insertId;
  return getEmployee(emp_id);
}

export async function attendanceStatus(emp_id) {
  const result = await pool.query(
    `
    SELECT emp_status FROM tbl_employee 
    WHERE emp_id = ?
    `,
    [emp_id]
  );
  return result[0];
}

export async function checkInAttendance(
  emp_id,
  check_in_office,
  check_in_time,
  check_in_imageName
) {
  const [result1] = await pool.query(
    `
    INSERT INTO tbl_attendance
    (
      emp_id,
      emp_name,
      check_in_office,
      check_in_time,
      check_in_imageName
      )
    VALUES (?,(SELECT emp_name FROM tbl_employee WHERE emp_id = ?),?,?,?)
    `,
    [emp_id, emp_id, check_in_office, check_in_time, check_in_imageName]
  );

  const [result2] = await pool.query(
    `
    UPDATE tbl_employee
    SET emp_status = 1
    WHERE emp_id = ?
    `,
    [emp_id]
  );

  const queryStatus = {
    Insertion: result1.insertId,
    Updation: result2.affectedRows,
  };

  return queryStatus;
}

export async function checkOutAttendance(
  emp_id,
  check_out_office,
  check_out_time,
  check_out_imageName
) {
  const [result1] = await pool.query(
    `
    UPDATE tbl_attendance
    SET 
    check_out_office = ?,
    check_out_time = ?,
    check_out_imageName = ? 
    WHERE emp_id = ?
    ORDER BY s_no DESC
    LIMIT 1
    `,
    [check_out_office, check_out_time, check_out_imageName, emp_id]
  );

  const [result2] = await pool.query(
    `
    UPDATE tbl_employee
    SET emp_status = 0
    WHERE emp_id = ?
    `,
    [emp_id]
  );
  const queryStatus = {
    firstQuery: result1.affectedRows,
    secondQuery: result2.affectedRows,
  };

  return queryStatus;
}

// export async function updateAttendance(emp_id) {
//   const [result] = await pool.query(
//     `
//     INSERT INTO tbl_attendance
//     `
//   )
// }

// await checkStuff();
// async function checkStuff() {
//   const employee = await attendanceStatus(3);
//   if (employee.emp_status == 0) {
//     console.log("not checked in");
//   } else {
//     console.log("checked in");
//   }
// }
// const employee = await attendanceStatus(1);
// console.log(employee);
// const employee = await getEmployees();
// console.log(employee);
