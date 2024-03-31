import "./css/Home.css";

const HorizontalComponent2 = ({ imgSrc, title, content }) => {
  return (
    <div className="horizontal-div-2">
      <img src={imgSrc} />
      <div className="title-3">{title}</div>
      <div className="content-1">{content}</div>
    </div>
  );
};

export default HorizontalComponent2;
