import { useNavigate } from "react-router-dom";

function NotFound() {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate("/");
  };

  return (
    <div className="flex items-center justify-center h-screen bg-uni-bg text-uni-text text-center px-6">
      <div>
        <h1 className="font-display text-7xl font-bold mb-3 bg-brand bg-clip-text text-transparent">
          404
        </h1>
        <p className="text-xl text-uni-muted mb-8">Page Not Found</p>
        <button
          onClick={handleGoHome}
          className="bg-brand text-uni-on-accent font-bold py-2.5 px-6 rounded-xl shadow-bubble hover:shadow-glow transition-all"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}

export default NotFound;
