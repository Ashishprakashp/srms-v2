import React, { useEffect, useState } from "react";
import { Container, Row, Col, Nav, Button, Table, Pagination, Spinner } from "react-bootstrap";
import { useLocation, useNavigate } from 'react-router-dom';
import TitleBar from "./TitleBar.js";
import StudentSideBar from "./StudentSideBar.js";
import axios from "axios"; // For making API requests

const EnrollmentDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [semesters, setSemesters] = useState([]); // State to store semester numbers
  const [students, setStudents] = useState([]); // State to store all students
  const [loading, setLoading] = useState(true); // Loading state
  const [selectedSemester, setSelectedSemester] = useState(null); // Selected semester
  const [currentPageEnrolled, setCurrentPageEnrolled] = useState(1); // Pagination for enrolled students
  const [currentPagePending, setCurrentPagePending] = useState(1); // Pagination for pending students
  const [studentsPerPage] = useState(5); // Number of students per page
  const { branch, regulation, from_year, to_year, _class } = location.state;
  const [course_id,setCourseId] = useState([]);

  // Fetch semester numbers from the database
  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        const response = await axios.get("http://localhost:5000/get-semester-numbers", {
          params: {
            course_name: branch, // Replace with dynamic value if needed
            regulation: regulation, // Replace with dynamic value if needed
          },
        });
        setSemesters(response.data.semesters); // Update state with fetched semesters
        setSelectedSemester(response.data.semesters[0]);
      } catch (error) {
        console.error("Error fetching semesters:", error);
      }
    };

    fetchSemesters();
  }, []);

  // Fetch all students from the database
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await axios.get("http://localhost:5000/student-class/all");

        // Filter students based on the criteria
        const filteredStudents = response.data.filter(
          (student) =>
            student.branch === branch &&
            student.regulation === regulation &&
            student.from_year === from_year &&
            student.to_year === to_year &&
            student._class === _class
        );

        // Update state with filtered students
        setStudents(filteredStudents);
        setLoading(false); // Set loading to false
      } catch (error) {
        console.error("Error fetching students:", error);
        setLoading(false); // Set loading to false even if there's an error
      }
    };

    fetchStudents();
  }, [branch, regulation, from_year, to_year, _class]); // Add dependencies to re-run the effect when these values change

  // Handle navigation to a specific semester
  const handleSemesterNavigation = (semester) => {
    setSelectedSemester(semester);
    setCurrentPageEnrolled(1); // Reset pagination for enrolled students
    setCurrentPagePending(1); // Reset pagination for pending students
  };

  const getCourseId = async () => {
    try {
      const response = await axios.get("http://localhost:5000/get-course-id", {
        params: {
          course_name: branch // Replace with the actual course name or variable
        }
      });
      if(response){
        setCourseId(response.data.course._id);
      }
      
    } catch (error) {
      console.error("Error fetching course Id:", error);
    }
  };
  getCourseId();

  // Filter students by semester
  const enrolledStudents = students.filter(
    (student) => student.enrolled === selectedSemester
  );
  const pendingStudents = students.filter(
    (student) => !student.enrolled !== selectedSemester
  );

  // Pagination functions
  const paginateEnrolled = (pageNumber) => setCurrentPageEnrolled(pageNumber);
  const paginatePending = (pageNumber) => setCurrentPagePending(pageNumber);

  // Get current students for each table
  const getCurrentStudents = (students, currentPage) => {
    const indexOfLast = currentPage * studentsPerPage;
    const indexOfFirst = indexOfLast - studentsPerPage;
    return students.slice(indexOfFirst, indexOfLast);
  };

  const revokeAll = async()=>{
    try{
      const response = await axios.post("http://localhost:5000/student/enrollment/revoke-all",{
        branch:branch, year:regulation, from_year:from_year, to_year:to_year, _class:_class 
      });
      console.log("revoke: "+response.data);
      setStudents((prevStudents) =>
        prevStudents.map((student) =>
          (student.enrolled===selectedSemester)
            ? { ...student, can_enroll: 0, enrolled: 0 }
            : student
        )
      );
    }catch(error){
      console.log("Error Revoking students!", error);
    }
  }

  const enableAll = async()=>{
    try{
      const response = await axios.post(`http://localhost:5000/student/enrollment/enable-all/${selectedSemester}`,{
        branch:branch, year:regulation, from_year:from_year, to_year:to_year, _class:_class 
      });
      console.log("enable: "+response.data);
      setStudents((prevStudents) =>
        prevStudents.map((student) => ({
          ...student,  // Spread previous student data
          can_enroll: selectedSemester,
          enrolled: 0
        }))
      );
      
    }catch(error){
      console.log("Error Revoking students!", error);
    }
  }

  const disableAll = async()=>{
    try{
      const response = await axios.post(`http://localhost:5000/student/enrollment/disable-all/${selectedSemester}`,{
        branch:branch, year:regulation, from_year:from_year, to_year:to_year, _class:_class 
      });
      console.log("disable: "+response.data);
      setStudents((prevStudents) =>
        prevStudents.map((student) => ({
          ...student,  // Spread previous student data
          can_enroll: 0,
          enrolled: 0
        }))
      );
      
    }catch(error){
      console.log("Error Disabling students!", error);
    }
  }

  const enableStudent = async (val, registerno) => {
    try {
      let response;
      if (val) {
        response = await axios.post("http://localhost:5000/enable-student-enroll", {
          register: registerno,
          sem_no: selectedSemester,
        });
      } else {
        response = await axios.post("http://localhost:5000/disable-student-enroll", {
          register: registerno,
          sem_no: 0,
        });
      }

      // Update the specific student in state
      setStudents((prevStudents) =>
        prevStudents.map((student) =>
          student.studentId === registerno
            ? { ...student, can_enroll: val, enrolled: val ? val : 0 }
            : student
        )
      );

      console.log(response.data);
    } catch (error) {
      console.log("Error toggling student enable state:", error);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div>
      <TitleBar />
      <div className="d-flex flex-grow-1">
        <StudentSideBar />
        <Container fluid className="p-4" style={{ overflowY: "auto", height: "calc(100vh - 56px)" }}>
          {/* Semester Navigation */}
          <Row className="mb-4">
            <Col>
              <Nav className="justify-content-center flex-wrap">
                {semesters.map((semester) => (
                  <Nav.Item key={semester} className="mb-2">
                    <Button
                      variant={selectedSemester === semester ? "primary" : "outline-primary"}
                      className="mx-1"
                      onClick={() => handleSemesterNavigation(semester)}
                    >
                      Semester {semester}
                    </Button>
                  </Nav.Item>
                ))}
              </Nav>
            </Col>
          </Row>

          {/* Render tables based on the selected semester */}
          {selectedSemester && (
            <>
              {/* Enrolled Students Table */}
              <Row className="mb-4">
                <Col>
                  <h2>Enrolled Students (Semester {selectedSemester})</h2>
                  {enrolledStudents.length > 0 ? (
                    <>
                      <button className="btn btn-danger float-end mb-5" onClick={()=>revokeAll()}>Revoke All</button>
                      <Table striped bordered hover>
                        <thead>
                          <tr>
                            <th>Student ID</th>
                            <th>Name</th>
                            <th>Branch</th>
                            <th>Regulation</th>
                            <th>Batch</th>
                            <th>Class</th>
                            <th>isEnabled?</th>
                            <th>isEnrolled?</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getCurrentStudents(enrolledStudents, currentPageEnrolled).map((student) => (
                            <tr key={student.studentId}>
                              <td>{student.studentId}</td>
                              <td>{student.name}</td>
                              <td>{student.branch}</td>
                              <td>{student.regulation}</td>
                              <td>{student.from_year} - {student.to_year}</td>
                              <td>{student._class}</td>
                              <td>{student.can_enroll ? "Yes" : "No"}</td>
                              <td>{student.enrolled ? "Yes" : "No"}</td>
                              <td>
                                <Button variant="primary" onClick={() => enableStudent(false, student.studentId)}>
                                  Revoke
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                      <Pagination>
                        {[...Array(Math.ceil(enrolledStudents.length / studentsPerPage)).keys()].map((number) => (
                          <Pagination.Item
                            key={number + 1}
                            active={number + 1 === currentPageEnrolled}
                            onClick={() => paginateEnrolled(number + 1)}
                          >
                            {number + 1}
                          </Pagination.Item>
                        ))}
                      </Pagination>
                    </>
                  ) : (
                    <p>No Students</p>
                  )}
                </Col>
                <Col>
                  <Button className="float-end" onClick={()=>{
                    
                    navigate(`/admin-dashboard/course-mgmt/course-spec/${course_id}/${regulation}`);
                  }
                    }>View Semester Details</Button>
                </Col>
              </Row>

              {/* Enrollment-Pending Students Table */}
              <Row className="mb-4">
                <Col>
                  <h2>Enrollment-Pending Students (Semester {selectedSemester})</h2>
                  {pendingStudents.length > 0 ? (
                    <>
                      <button className="btn btn-success float-end ms-5 me-4 mb-5" onClick={()=>enableAll()}>Enable All</button>
                      <button className="btn btn-danger float-end mb-5" onClick={()=>disableAll()}>Disable All</button>
                      <Table striped bordered hover>
                        <thead>
                          <tr>
                            <th>Student ID</th>
                            <th>Name</th>
                            <th>Branch</th>
                            <th>Regulation</th>
                            <th>Batch</th>
                            <th>Class</th>
                            <th>isEnabled?</th>
                            <th>isEnrolled?</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getCurrentStudents(pendingStudents, currentPagePending).map((student) => (
                            <tr key={student.studentId}>
                              <td>{student.studentId}</td>
                              <td>{student.name}</td>
                              <td>{student.branch}</td>
                              <td>{student.regulation}</td>
                              <td>{student.from_year} - {student.to_year}</td>
                              <td>{student._class}</td>
                              <td>{student.can_enroll ? "Yes" : "No"}</td>
                              <td>{student.enrolled ? "Yes" : "No"}</td>
                              <td>
                                {student.can_enroll ? (
                                  <button className="btn btn-danger" onClick={() => enableStudent(false, student.studentId)}>
                                    Disable
                                  </button>
                                ) : (
                                  <button className="btn btn-success" onClick={() => enableStudent(true, student.studentId)}>
                                    Enable
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                      <Pagination>
                        {[...Array(Math.ceil(pendingStudents.length / studentsPerPage)).keys()].map((number) => (
                          <Pagination.Item
                            key={number + 1}
                            active={number + 1 === currentPagePending}
                            onClick={() => paginatePending(number + 1)}
                          >
                            {number + 1}
                          </Pagination.Item>
                        ))}
                      </Pagination>
                    </>
                  ) : (
                    <p>No Students</p>
                  )}
                </Col>
              </Row>
            </>
          )}
        </Container>
      </div>
    </div>
  );
};

export default EnrollmentDetails;