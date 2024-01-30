import { Button } from "@material-ui/core";
import { useNavigate } from "react-router-dom";

const Home2 = () => {
  const navigate = useNavigate();

  const handleSystemCheck = () => {
    navigate("/systemcheck");
  };

  const handleDetectionCheck = () => {
    navigate("/detectioncheck");
  };

  return (
    <div>
      Home
      <div>
        <Button onClick={handleSystemCheck}> System Check </Button>
        <ul>
          <li>instruction 1</li>
          <li>instruction 2</li>
          <li>instruction 3</li>
          <li>instruction 4</li>
          <li>instruction 5</li>
        </ul>
      </div>
      <Button onClick={handleDetectionCheck}>Check the basic detections</Button>
    </div>
  );
};

export default Home2;
