import { ClipLoader } from "react-spinners";

const LoadingSpinner = ({ size = 36 }) => {
  return (
    <div className="flex justify-center items-center">
      <ClipLoader color="#DDA23A" size={size} />
    </div>
  );
};

export default LoadingSpinner;
