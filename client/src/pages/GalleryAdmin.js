import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Spinner, Badge, Tab, Tabs } from 'react-bootstrap';
import axios from 'axios';

function GalleryAdmin() {
	const [activeTab, setActiveTab] = useState('gallery');
	const [media, setMedia] = useState([]);
	const [posts, setPosts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [loadingPosts, setLoadingPosts] = useState(true);
	const [message, setMessage] = useState('');
	const [syncLimit, setSyncLimit] = useState(20);
	const [syncing, setSyncing] = useState(false);
	const [toggleId, setToggleId] = useState(null);
	const [deleteId, setDeleteId] = useState(null);

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

	const fetchPosts = async () => {
		setLoadingPosts(true);
		try {
			const res = await axios.get('/api/facebook/posts', {
				headers: { 'x-auth-token': localStorage.getItem('token') },
				params: { limit: 100 }
			});
			if (res.data?.success) {
				setPosts(res.data.data || []);
			}
		} catch (err) {
			setMessage(err.response?.data?.message || 'خطأ في جلب منشورات الصفحة');
		} finally {
			setLoadingPosts(false);
		}
	};

	useEffect(() => {
		fetchGallery();
		fetchPosts();
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
			await fetchPosts();
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

	const handleDeleteMedia = async (id) => {
		if (!window.confirm('هل أنت متأكد من الحذف النهائي لهذه الصورة من النظام؟')) return;
		setDeleteId(id);
		setMessage('');
		try {
			const res = await axios.delete(`/api/facebook/gallery/${id}`, {
				headers: { 'x-auth-token': localStorage.getItem('token') }
			});
			if (res.data?.success) {
				setMedia((prev) => prev.filter((m) => m._id !== id));
				setMessage('تم حذف الوسائط بنجاح');
			}
		} catch (err) {
			setMessage(err.response?.data?.message || 'خطأ في الحذف');
		} finally {
			setDeleteId(null);
		}
	};

	const handleTogglePost = async (item) => {
		if (!item?._id || toggleId) return;
		setToggleId(item._id);
		setMessage('');
		try {
			const res = await axios.patch(
				`/api/facebook/posts/${item._id}/visibility`,
				{ isActive: item.isActive === false ? true : false }, // if unset, it means true
				{ headers: { 'x-auth-token': localStorage.getItem('token') } }
			);
			if (res.data?.success) {
				setPosts((prev) => prev.map((p) => (p._id === item._id ? res.data.data : p)));
			}
		} catch (err) {
			setMessage(err.response?.data?.message || 'خطأ في تحديث حالة البوست');
		} finally {
			setToggleId(null);
		}
	};

	const handleDeletePost = async (id) => {
		if (!window.confirm('هل أنت متأكد من الحذف النهائي لهذا المنشور من النظام؟')) return;
		setDeleteId(id);
		setMessage('');
		try {
			const res = await axios.delete(`/api/facebook/posts/${id}`, {
				headers: { 'x-auth-token': localStorage.getItem('token') }
			});
			if (res.data?.success) {
				setPosts((prev) => prev.filter((p) => p._id !== id));
				setMessage('تم حذف المنشور بنجاح');
			}
		} catch (err) {
			setMessage(err.response?.data?.message || 'خطأ في الحذف');
		} finally {
			setDeleteId(null);
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

			<Tabs
				id="gallery-admin-tabs"
				activeKey={activeTab}
				onSelect={(k) => setActiveTab(k)}
				className="mb-4"
			>
				<Tab eventKey="gallery" title="محتوى المعرض (صور وفيديوهات)">
					{loading ? (
						<div className="d-flex justify-content-center my-5">
							<Spinner animation="border" />
						</div>
					) : (
						<Row>
							{media.map((item) => (
								<Col md={4} lg={3} key={item._id} className="mb-4">
									<Card className="h-100 shadow-sm border-0">
										{item.type === 'video' ? (
											<div style={{ position: 'relative' }}>
												<img
													src={item.thumbnailUrl || item.mediaUrl}
													alt="Video"
													style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: '8px 8px 0 0' }}
												/>
												<Badge bg="dark" style={{ position: 'absolute', top: 10, right: 10 }}>فيديو</Badge>
											</div>
										) : (
											<img
												src={item.mediaUrl}
												alt="Media"
												style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: '8px 8px 0 0' }}
											/>
										)}
										<Card.Body className="d-flex flex-column justify-content-between p-3">
											<div>
												<p className="small text-muted mb-2 text-truncate" title={item.description || item.title}>
													{item.description || item.title || 'بدون وصف'}
												</p>
											</div>
											<div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
												<Button
													variant={item.isActive ? 'outline-secondary' : 'success'}
													size="sm"
													disabled={toggleId === item._id}
													onClick={() => handleToggle(item)}
													className="d-flex align-items-center gap-1"
												>
													{item.isActive ? <>🙈 إخفاء</> : <>👁️ تفعيل</>}
												</Button>
												<Button
													variant="danger"
													size="sm"
													disabled={deleteId === item._id}
													onClick={() => handleDeleteMedia(item._id)}
													className="d-flex align-items-center gap-1"
												>
													🗑️ حذف
												</Button>
											</div>
										</Card.Body>
									</Card>
								</Col>
							))}
							{media.length === 0 && (
								<Col>
									<Alert variant="info" className="text-center">لا توجد وسائط في المعرض حالياً.</Alert>
								</Col>
							)}
						</Row>
					)}
				</Tab>

				<Tab eventKey="posts" title="منشورات الصفحة الرئيسية">
					{loadingPosts ? (
						<div className="d-flex justify-content-center my-5">
							<Spinner animation="border" />
						</div>
					) : (
						<Row>
							{posts.map((post) => (
								<Col md={6} lg={4} key={post._id} className="mb-4">
									<Card className="h-100 shadow-sm border-0">
										{post.picture && (
											<img
												src={post.picture}
												alt="Post"
												style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: '8px 8px 0 0' }}
											/>
										)}
										<Card.Body className="d-flex flex-column justify-content-between">
											<div>
												<Badge bg={post.isActive !== false ? 'success' : 'secondary'} className="mb-2">
													{post.isActive !== false ? 'ظاهر بالموقع' : 'مخفي'}
												</Badge>
												<p className="mb-1" style={{ fontSize: '0.9rem' }}>
													{post.message ? (post.message.length > 100 ? `${post.message.substring(0, 100)}...` : post.message) : (post.story || 'بوست بدون نص')}
												</p>
												<small className="text-muted d-block mb-3">
													{new Date(post.createdTime).toLocaleDateString('ar-EG')}
												</small>
											</div>
											<div className="d-flex justify-content-between align-items-center pt-2 border-top">
												<Button
													variant={post.isActive !== false ? 'outline-secondary' : 'success'}
													size="sm"
													disabled={toggleId === post._id}
													onClick={() => handleTogglePost(post)}
													className="d-flex align-items-center gap-1"
												>
													{post.isActive !== false ? <>🙈 إخفاء</> : <>👁️ الإظهار بالموقع</>}
												</Button>
												<Button
													variant="danger"
													size="sm"
													disabled={deleteId === post._id}
													onClick={() => handleDeletePost(post._id)}
													className="d-flex align-items-center gap-1"
												>
													🗑️ حذف
												</Button>
											</div>
										</Card.Body>
									</Card>
								</Col>
							))}
							{posts.length === 0 && (
								<Col>
									<Alert variant="info" className="text-center">لا توجد بوستات حالياً.</Alert>
								</Col>
							)}
						</Row>
					)}
				</Tab>
			</Tabs>
		</Container>
	);
}

export default GalleryAdmin;
