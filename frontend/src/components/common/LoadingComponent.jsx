import { ClipLoader } from "react-spinners";

const LoadingSpinner = ({ size = 36 }) => {
  return (
    <div className="flex justify-center items-center">
      <ClipLoader color="#6366F1" size={size} />
    </div>
  );
};

export default LoadingSpinner;
