import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faMapSigns, faCalendarCheck } from '@fortawesome/free-solid-svg-icons';

function NotFound() {
  // Theme Isolation: Matching the Landing page theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    return () => {
      document.documentElement.setAttribute('data-theme', 'light');
    };
  }, []);

  const styles = `
    .not-found-page {
      margin: 0;
      background: #080f0b;
      color: #f5f0e8;
      font-family: 'Tajawal', 'Arial', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      text-align: center;
      direction: rtl;
    }

    .not-found-page::before {
      content: '';
      position: fixed;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(ellipse at 20% 50%, rgba(26,58,42,0.15) 0%, transparent 50%),
                  radial-gradient(ellipse at 80% 20%, rgba(201,160,78,0.06) 0%, transparent 40%),
                  radial-gradient(ellipse at 50% 80%, rgba(26,58,42,0.1) 0%, transparent 50%);
      pointer-events: none;
      z-index: 0;
      animation: ambientShift 20s ease-in-out infinite alternate;
    }

    @keyframes ambientShift {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(-3%, 2%) scale(1.05); }
    }

    .nf-content {
      position: relative;
      z-index: 1;
      padding: 40px;
      max-width: 600px;
      background: rgba(15,36,25,0.65);
      border: 1px solid rgba(201,160,78,0.15);
      border-radius: 32px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(201,160,78,0.1);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      animation: slideUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      opacity: 0;
      transform: translateY(40px);
    }

    @keyframes slideUp {
      to { opacity: 1; transform: translateY(0); }
    }

    .nf-error-code {
      font-size: clamp(80px, 15vw, 150px);
      font-weight: 900;
      line-height: 1;
      margin: 0;
      background: linear-gradient(135deg, #c9a04e, #e6c27b, #1fb6a6);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      text-shadow: 0 10px 30px rgba(201,160,78,0.3);
      position: relative;
      display: inline-block;
    }

    .nf-character {
      font-size: 80px;
      line-height: 1;
      margin-bottom: 20px;
      display: inline-block;
      animation: lookAround 4s ease-in-out infinite;
      filter: drop-shadow(0 10px 15px rgba(0,0,0,0.4));
    }

    @keyframes lookAround {
      0%, 100% { transform: rotate(0deg) scale(1); }
      25% { transform: rotate(-15deg) scale(1.1) translateX(-10px); }
      50% { transform: rotate(0deg) scale(1); }
      75% { transform: rotate(15deg) scale(1.1) translateX(10px); }
    }

    .nf-title {
      font-size: clamp(24px, 4vw, 32px);
      color: #c9a04e;
      font-weight: 800;
      margin: 10px 0 15px;
    }

    .nf-desc {
      color: #b0a08a;
      font-size: 16px;
      line-height: 1.8;
      margin-bottom: 30px;
    }

    .nf-actions {
      display: flex;
      gap: 15px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .nf-btn {
      padding: 12px 24px;
      border-radius: 14px;
      font-weight: 700;
      text-decoration: none;
      transition: all 0.3s ease;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .nf-btn-primary {
      background: linear-gradient(135deg, #c9a04e, #e6c27b);
      color: #080f0b !important;
      border: 1px solid rgba(255,255,255,0.2);
    }

    .nf-btn-primary:hover {
      background: linear-gradient(135deg, #e6c27b, #c9a04e);
      box-shadow: 0 10px 25px rgba(201,160,78,0.3);
      transform: translateY(-3px);
    }

    .nf-btn-secondary {
      background: rgba(201,160,78,0.05);
      color: #c9a04e !important;
      border: 1px solid rgba(201,160,78,0.3);
    }

    .nf-btn-secondary:hover {
      background: rgba(201,160,78,0.15);
      border-color: #c9a04e;
      transform: translateY(-3px);
    }

    /* Floating elements in the background */
    .nf-floating {
      position: absolute;
      font-size: 40px;
      opacity: 0.15;
      animation: floatItem 8s ease-in-out infinite;
      z-index: 0;
    }

    .nf-float-1 { top: 15%; left: 10%; animation-delay: 0s; font-size: 60px; }
    .nf-float-2 { top: 60%; right: 15%; animation-delay: 2s; font-size: 50px; }
    .nf-float-3 { bottom: 10%; left: 20%; animation-delay: 4s; font-size: 70px; }
    .nf-float-4 { top: 25%; right: 25%; animation-delay: 6s; font-size: 45px; }

    @keyframes floatItem {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-30px) rotate(15deg); }
    }
  `;

  return (
    <div className="not-found-page">
      <style>{styles}</style>

      {/* Floating Background Emojis */}
      <div className="nf-floating nf-float-1">💄</div>
      <div className="nf-floating nf-float-2">📸</div>
      <div className="nf-floating nf-float-3">💇‍♀️</div>
      <div className="nf-floating nf-float-4">💅</div>

      <Container className="d-flex justify-content-center">
        <div className="nf-content">
          <div className="nf-character">🤷‍♀️</div>
          <h1 className="nf-error-code">404</h1>
          <h2 className="nf-title">إنت تاهت ولا إيه يا قمر؟ 😂</h2>
          <p className="nf-desc">
            استني بس... المكان ده مش موجود في السنتر عندنا! <br />
            الظاهر إنك دخلتي غرفة غلط، مفيش ميك أب هنا ولا مساج ولا تصوير. الداتا بيز بتدور ومش لاقية حاجة.
          </p>
          <div className="nf-actions">
            <Link to="/" className="nf-btn nf-btn-primary">
              <FontAwesomeIcon icon={faHome} />
              العودة للرئيسية
            </Link>
            <Link to="/prices" className="nf-btn nf-btn-secondary">
              <FontAwesomeIcon icon={faCalendarCheck} />
              شوفي باكدجاتنا
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}

export default NotFound;
