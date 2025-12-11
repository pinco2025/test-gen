import React from 'react';

const TitleBar: React.FC = () => {
  const handleMinimize = async () => {
    if (window.electronAPI) {
      await window.electronAPI.window.minimize();
    }
  };

  const handleMaximize = async () => {
    if (window.electronAPI) {
      await window.electronAPI.window.maximize();
    }
  };

  const handleClose = async () => {
    if (window.electronAPI) {
      await window.electronAPI.window.close();
    }
  };

  return (
    <div className="title-bar">
      <div className="title-bar-title">
        <img
          src="https://drive.google.com/thumbnail?id=1yLtX3YxubbDBsKYDj82qiaGbSkSX7aLv&sz=w1000"
          alt="Logo"
          style={{ width: '16px', height: '16px' }}
        />
        <span>Test Generator</span>
      </div>
      <div className="title-bar-controls">
        <button className="title-bar-btn" onClick={handleMinimize} title="Minimize">
          <span className="material-symbols-outlined">remove</span>
        </button>
        <button className="title-bar-btn" onClick={handleMaximize} title="Maximize">
          <span className="material-symbols-outlined">crop_square</span>
        </button>
        <button className="title-bar-btn close" onClick={handleClose} title="Close">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
