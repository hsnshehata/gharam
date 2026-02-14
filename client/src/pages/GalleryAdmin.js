import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import axios from 'axios';

function GalleryAdmin() {
	const [media, setMedia] = useState([]);
	const [loading, setLoading] = useState(true);
	const [message, setMessage] = useState('');
	const [syncLimit, setSyncLimit] = useState(20);
	const [syncing, setSyncing] = useState(false);
	const [toggleId, setToggleId] = useState(null);

	const fetchGallery = async () => {
		setLoading(true);
		setMessage('');
		try {
			const res = await axios.get('/api/facebook/gallery', {
				headers: { 'x-auth-token': localStorage.getItem('token') },
				params: { limit: 500 }
			});
			if (res.data?.success) {
				setMedia(res.data.data || []);
			}
		} catch (err) {
			setMessage(err.response?.data?.message || 'خطأ في جلب المعرض');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchGallery();
	}, []);

	const handleSync = async () => {
		if (syncing) return;
		setSyncing(true);
		setMessage('');
		try {
			const res = await axios.post('/api/facebook/sync',
				{ limit: Number(syncLimit) || 20 },
				{ headers: { 'x-auth-token': localStorage.getItem('token') } }
			);
			setMessage(res.data?.message || 'تمت المزامنة');
			await fetchGallery();
		} catch (err) {
			setMessage(err.response?.data?.message || 'خطأ في المزامنة');
		} finally {
			setSyncing(false);
		}
	};

	const handleToggle = async (item) => {
		if (!item?._id || toggleId) return;
		setToggleId(item._id);
		setMessage('');
		try {
			const res = await axios.patch(
				`/api/facebook/gallery/${item._id}/visibility`,
				{ isActive: !item.isActive },
				{ headers: { 'x-auth-token': localStorage.getItem('token') } }
			);
			if (res.data?.success) {
				setMedia((prev) => prev.map((m) => (m._id === item._id ? res.data.data : m)));
			}
		} catch (err) {
			setMessage(err.response?.data?.message || 'خطأ في تحديث الحالة');
		} finally {
			setToggleId(null);
		}
	};

	return (
		<Container>
			<Row className="mb-4">
				<Col>
					<h3>المعرض</h3>
					<p style={{ color: 'var(--muted)' }}>إدارة صور وفيديوهات المعرض.</p>
				</Col>
			</Row>

			<Card className="mb-4">
				<Card.Body>
					<Row className="align-items-end">
						<Col md={4}>
							<Form.Label>عدد البوستات في المزامنة</Form.Label>
							<Form.Control
								type="number"
								min="1"
								max="100"
								value={syncLimit}
								onChange={(e) => setSyncLimit(e.target.value)}
							/>
						</Col>
						<Col md={4}>
							<Button variant="primary" onClick={handleSync} disabled={syncing}>
								{syncing ? 'جاري المزامنة...' : 'مزامنة المعرض'}
							</Button>
						</Col>
					</Row>
				</Card.Body>
			</Card>

			{message && <Alert variant={message.includes('خطأ') ? 'danger' : 'success'}>{message}</Alert>}

			{loading ? (
				<div className="d-flex justify-content-center">
					<Spinner animation="border" />
				</div>
			) : (
				<Row>
					{media.map((item) => (
						<Col md={4} lg={3} key={item._id} className="mb-4">
							<Card>
								{item.type === 'video' ? (
									<div style={{ position: 'relative' }}>
										<img
											src={item.thumbnailUrl || item.mediaUrl}
											alt="Video"
											style={{ width: '100%', height: 220, objectFit: 'cover' }}
										/>
										<Badge bg="dark" style={{ position: 'absolute', top: 10, right: 10 }}>فيديو</Badge>
									</div>
								) : (
									<img
										src={item.mediaUrl}
										alt="Media"
										style={{ width: '100%', height: 220, objectFit: 'cover' }}
									/>
								)}
								<Card.Body>
									<div className="d-flex justify-content-between align-items-center">
										<Badge bg={item.isActive ? 'success' : 'secondary'}>
											{item.isActive ? 'ظاهر' : 'مخفي'}
										</Badge>
										<Button
											variant={item.isActive ? 'outline-danger' : 'outline-success'}
											size="sm"
											disabled={toggleId === item._id}
											onClick={() => handleToggle(item)}
										>
											{item.isActive ? 'منع العرض' : 'إظهار'}
										</Button>
									</div>
								</Card.Body>
							</Card>
						</Col>
					))}
				</Row>
			)}
		</Container>
	);
}

export default GalleryAdmin;
