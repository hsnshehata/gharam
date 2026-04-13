import React from 'react';
import QRCode from 'qrcode.react';
import { Table } from 'react-bootstrap';

const formatDate = (dateString) => {
  if (!dateString) return 'غير متوفر';
  const d = new Date(dateString);
  if (isNaN(d)) return 'غير متوفر';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const ReceiptPrint = ({ data, type }) => {
  if (!data || !type) return null;

  return (
    <div
      className="receipt-content"
      style={{
        backgroundColor: '#fff',
        color: '#000',
        fontWeight: 'bold',
        fontSize: '15px',
        width: '75mm',
        padding: '3mm',
        textAlign: 'center',
        margin: '0 auto',
        fontFamily: 'Tajawal, Arial, sans-serif'
      }}
    >
      <style>
        {`
          .receipt-content, .receipt-content * {
            color: #000 !important;
          }
          .receipt-content th, .receipt-content td,
          .receipt-content .table thead th,
          .receipt-content .table th,
          .receipt-content .table td,
          .receipt-content thead th {
            color: #000 !important;
            background-color: #fff !important;
            background: #fff !important;
          }
          @media print {
            @page { size: 90mm auto; margin: 0; }
            body { margin: 0; padding: 0; width: 75mm; }
            /* اخفي كل حاجة وقت الطباعة إلا الوصل النشط */
            body * { visibility: hidden !important; }
            .receipt-content.print-active, .receipt-content.print-active * { visibility: visible !important; color: #000 !important; }
            .receipt-content.print-active { position: absolute; left: 0; top: 0; width: 75mm; margin: 0 auto; padding: 10mm 3mm 5mm 3mm; font-size: 15px; text-align: center; }
            .receipt-content.print-active th,
            .receipt-content.print-active td,
            .receipt-content.print-active .table thead th,
            .receipt-content.print-active thead th { color: #000 !important; background-color: #fff !important; background: #fff !important; }
            .qr-code { margin: 5mm auto; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 2mm; }
            img { max-width: 100%; height: auto; }
          }
        `}
      </style>
      <img src="/logo4print.png" alt="Logo" style={{ height: '30mm', marginBottom: '5mm' }} />
      <h5>Beauty Center</h5>
      {type === 'booking' ? (
        <>
          <p>اسم العميل: {data.clientName || 'غير متوفر'}</p>
          <p>رقم الوصل: {data.receiptNumber || 'غير متوفر'}</p>
          <p>تاريخ المناسبة: {data.eventDate ? formatDate(data.eventDate) : 'غير متوفر'}</p>
          {data.hennaDate && <p>تاريخ الحنة: {formatDate(data.hennaDate)}</p>}
          <h6>تفاصيل الباكدجات:</h6>
          <Table bordered size="sm">
            <thead>
              <tr>
                <th>الباكدج</th>
                <th>السعر</th>
              </tr>
            </thead>
            <tbody>
              <tr key={data.package?._id ? `pkg-main-${data.package._id.toString()}` : 'pkg-main'}>
                <td>{data.package?.name || 'غير متوفر'}</td>
                <td>{data.package?.price ? `${data.package.price} جنيه` : 'غير متوفر'}</td>
              </tr>
              {data.hennaPackage && (
                <tr key={data.hennaPackage._id ? `pkg-henna-${data.hennaPackage._id.toString()}` : 'pkg-henna'}>
                  <td>{data.hennaPackage.name} (حنة)</td>
                  <td>{data.hennaPackage.price ? `${data.hennaPackage.price} جنيه` : 'غير متوفر'}</td>
                </tr>
              )}
              {data.photographyPackage && (
                <tr key={data.photographyPackage._id ? `pkg-photo-${data.photographyPackage._id.toString()}` : 'pkg-photo'}>
                  <td>{data.photographyPackage.name} (تصوير)</td>
                  <td>{data.photographyPackage.price ? `${data.photographyPackage.price} جنيه` : 'غير متوفر'}</td>
                </tr>
              )}
            </tbody>
          </Table>
          {data.extraServices?.length > 0 && (
            <>
              <h6>الخدمات الإضافية:</h6>
              <Table bordered size="sm">
                <thead>
                  <tr>
                    <th>الخدمة</th>
                    <th>السعر</th>
                  </tr>
                </thead>
                <tbody>
                  {data.extraServices.map((srv, index) => (
                    <tr key={srv._id ? `extra-${srv._id.toString()}` : `extra-service-${index}`}>
                      <td>{srv.name || 'غير معروف'}</td>
                      <td>{srv.price ? `${srv.price} جنيه` : 'غير معروف'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <h6>الخدمات المرتجعة:</h6>
              <Table bordered size="sm">
                <thead>
                  <tr>
                    <th>الخدمة</th>
                    <th>السعر</th>
                  </tr>
                </thead>
                <tbody>
                  {data.returnedServices.map((srv, index) => (
                    <tr key={srv._id ? `returned-${srv._id.toString()}` : `returned-service-${index}`}>
                      <td>{srv.name || 'غير معروف'}</td>
                      <td>{srv.price ? `-${srv.price} جنيه` : 'غير معروف'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </>
          )}
          {data.hairStraightening && (
            <>
              <h6>فرد الشعر:</h6>
              <Table bordered size="sm">
                <tbody>
                  <tr key="hairStraightening">
                    <td>فرد شعر</td>
                    <td>{data.hairStraighteningPrice ? `${data.hairStraighteningPrice} جنيه` : 'غير معروف'}</td>
                  </tr>
                  <tr key="hairStraighteningDate">
                    <td>تاريخ فرد الشعر</td>
                    <td>{data.hairStraighteningDate ? formatDate(data.hairStraighteningDate) : 'غير معروف'}</td>
                  </tr>
                </tbody>
              </Table>
            </>
          )}
          <p><strong>الإجمالي: {data.total ? `${data.total} جنيه` : 'غير معروف'}</strong></p>
          <p><strong>العربون: {data.deposit ? `${data.deposit} جنيه` : 'غير معروف'}</strong></p>
          <p><strong>المتبقي: {data.remaining ? `${data.remaining} جنيه` : 'غير معروف'}</strong></p>
        </>
      ) : (
        <>
          <p>رقم الوصل: {data.receiptNumber || 'غير متوفر'}</p>
          <p>تاريخ الخدمة: {data.createdAt ? formatDate(data.createdAt) : 'غير متوفر'}</p>
          <p>الموظف: {data.employeeId ? data.employeeId.username : 'غير محدد'}</p>
          <h6>الخدمات:</h6>
          <Table bordered size="sm">
            <thead>
              <tr>
                <th>الخدمة</th>
                <th>السعر</th>
              </tr>
            </thead>
            <tbody>
              {data.services?.length > 0 ? (
                data.services.map((srv, index) => (
                  <tr key={srv._id ? srv._id.toString() : `service-${index}`}>
                    <td>{srv.name || 'غير معروف'}</td>
                    <td>{srv.price ? `${srv.price} جنيه` : 'غير معروف'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="2">غير محدد</td>
                </tr>
              )}
            </tbody>
          </Table>
          <p><strong>الإجمالي: {data.total ? `${data.total} جنيه` : 'غير معروف'}</strong></p>
        </>
      )}
      {data.barcode && (
        <div className="qr-code">
          <QRCode value={data.barcode} size={80} renderAs="svg" />
          <p style={{ marginTop: '5px', fontSize: '14px', fontWeight: 'bold' }}>الترتيب: {data.dailyQueueNumber || '-'}</p>
        </div>
      )}
    </div>
  );
};

export default ReceiptPrint;