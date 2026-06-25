import ChatList from "./ChatList";
import Userinfo from "./UserInfo";

const List = () => {
  return (
    <div className="flex flex-col h-screen w-full overflow-hidden">
      <Userinfo />
      <ChatList />
    </div>
  );
};

export default List;
