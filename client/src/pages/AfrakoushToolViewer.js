import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';
import { useToast } from '../components/ToastProvider';

function AfrakoushToolViewer({ isPublic }) {
  const { name } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageData, setPageData] = useState(null);
  const containerRef = useRef(null);
  const { showToast } = useToast();

  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoading(true);
        const headers = {};
        if (!isPublic) {
          const token = localStorage.getItem('token');
          if (token) headers['x-auth-token'] = token;
        }

        const res = await axios.get(`/api/afrakoush/${name}`, { headers });
        setPageData(res.data);
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          setError('ليس لديك الصلاحية لفتح هذه الأداة.');
        } else if (err.response?.status === 404) {
          setError('هذه الأداة غير موجودة.');
        } else {
          setError(err.response?.data?.message || 'حدث خطأ أثناء تحميل الأداة.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [name, isPublic]);

  useEffect(() => {
    if (pageData && pageData.html && pageData.script && containerRef.current) {
      // 1. Inject HTML
      containerRef.current.innerHTML = pageData.html;

      // 2. Setup apiClient with auth token for the tool to use safely
      const token = localStorage.getItem('token');
      const apiClient = axios.create({
        headers: token ? { 'x-auth-token': token } : {}
      });

      // 3. Execute script in a constrained local scope
      try {
        // eslint-disable-next-line no-new-func
        const executeTool = new Function('apiClient', 'container', 'showToast', `
          try {
            ${pageData.script}
          } catch(e) {
            console.error("Afrakoush tool execution error:", e);
            showToast("حدث خطأ داخل كود الأداة", "danger");
          }
        `);
        
        executeTool(apiClient, containerRef.current, showToast);
      } catch (e) {
        console.error("Failed to parse Afrakoush script:", e);
        setError('تعذر تشغيل كود الأداة بسبب خطأ في بناء الجملة (Syntax).');
      }
    }
  }, [pageData, showToast]);

  if (loading) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">جاري تحميل الأداة السحرية...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">
          <Alert.Heading>عذراً!</Alert.Heading>
          <p>{error}</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid={!isPublic} className={isPublic ? "mt-5" : "mt-4"}>
      <Card className="shadow-sm border-0">
        <Card.Header className="bg-white border-0 pt-4 pb-0">
          <h2 style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{pageData?.title}</h2>
          {pageData?.allowedRole === 'public' && isPublic === false && (
            <Alert variant="info" className="py-2 mt-2">هذه صفحة عامة للجمهور.</Alert>
          )}
        </Card.Header>
        <Card.Body>
          <div ref={containerRef} className="afrakoush-sandbox">
            {/* The tool HTML and dynamic content will be injected here */}
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}

export default AfrakoushToolViewer;
