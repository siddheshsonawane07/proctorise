import { Button } from "@material-ui/core";
import { useNavigate } from "react-router-dom";

const Home2 = () => {
  const navigate = useNavigate();

  const handleSystemCheck = () => {
    navigate("/systemcheck");
  };
  return (
    <div>
      Home
      <div>
        <Button onClick={handleSystemCheck}>System Check </Button>
        <Button>Instructions</Button>
      </div>
    </div>
  );
};

export default Home2;
