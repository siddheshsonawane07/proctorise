import "./css/Home.css";

const CardComponent = ({ imgSrc, title, content, buttonFunction }) => {
  return (
    <div className="card">
      <img src={imgSrc} className="card-icon" />
      <div className="card-title">{title}</div>
      <div className="card-content">{content}</div>
      <button className="card-button">EXPLORE</button>
    </div>
  );
};

export default CardComponent;
