
const CardComponent = ({ imgSrc, title, content, buttonType }) => {
  return (
    <div className="home-1-card">
      <img src={imgSrc} className="home-1-card-icon" />
      <div className="home-1-card-title">{title}</div>
      <div className="home-1-card-content">{content}</div>
      <button className={`home-1-card-button`} id={`${buttonType}`}>
        EXPLORE
      </button>
    </div>
  );
};

export default CardComponent;
