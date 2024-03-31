import "./css/Home.css";

const CardComponent = ({ imgSrc, title, content, buttonType }) => {
  return (
    <div className="card">
      <img src={imgSrc} className="card-icon" />
      <div className="card-title">{title}</div>
      <div className="card-content">{content}</div>
      <button className={`card-button`} id={`${buttonType}`}>
        Explore
      </button>
    </div>
  );
};

export default CardComponent;
