import React from 'react';
import QRCode from 'qrcode.react';
import { Table } from 'react-bootstrap';

// وظيفة موحدة لطباعه وصل واحد بس عن طريق نسخ العنصر لعناصر الطباعة وعزل باقي الصفحة
export const printReceiptElement = (element) => {
  if (!element) return;

  const clone = element.cloneNode(true);
  clone.classList.add('print-active');

  const logo = clone.querySelector('img[src="/logo.png"]');
  if (logo) logo.src = `${window.location.origin}/logo.png`;

  const printContainer = document.createElement('div');
  printContainer.id = 'receipt-print-container';
  printContainer.appendChild(clone);

  const style = document.createElement('style');
  style.setAttribute('data-print-style', 'receipt-only');
  style.textContent = `
    @media print {
      @page { size: 80mm auto; margin: 0; }
      body * { visibility: hidden !important; }
      #receipt-print-container, #receipt-print-container * { visibility: visible !important; }
      #receipt-print-container { position: absolute; top: 0; left: 0; width: 80mm; margin: 0 auto; padding: 10mm; font-size: 13px; text-align: center; }
    }
  `;

  document.body.appendChild(printContainer);
  document.head.appendChild(style);

  const cleanup = () => {
    if (printContainer.parentNode) document.body.removeChild(printContainer);
    if (style.parentNode) document.head.removeChild(style);
    window.onafterprint = null;
  };

  window.onafterprint = cleanup;
  window.print();
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
        fontSize: '12px',
        width: '80mm',
        padding: '10mm',
        textAlign: 'center',
        margin: '0 auto',
        fontFamily: 'Tajawal, Arial, sans-serif'
      }}
    >
      <style>
        {`
          @media print {
            @page { size: 80mm auto; margin: 0; }
            body { margin: 0; padding: 0; width: 80mm; }
            /* اخفي كل حاجة وقت الطباعة إلا الوصل النشط */
            body * { visibility: hidden !important; }
            .receipt-content.print-active, .receipt-content.print-active * { visibility: visible !important; }
            .receipt-content.print-active { position: absolute; left: 0; top: 0; width: 80mm; margin: 0 auto; padding: 10mm; font-size: 13px; text-align: center; }
            .qr-code { margin: 10mm auto; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 2mm; }
            img { max-width: 100%; height: auto; }
          }
        `}
      </style>
      <img src="/logo.png" alt="Logo" style={{ height: '25mm', marginBottom: '10mm' }} />
      <h5>Beauty Center</h5>
      {type === 'booking' ? (
        <>
          <p>اسم العميل: {data.clientName || 'غير متوفر'}</p>
          <p>رقم الوصل: {data.receiptNumber || 'غير متوفر'}</p>
          <p>تاريخ المناسبة: {data.eventDate ? new Date(data.eventDate).toLocaleDateString() : 'غير متوفر'}</p>
          {data.hennaDate && <p>تاريخ الحنة: {new Date(data.hennaDate).toLocaleDateString()}</p>}
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
            </>
          )}
          {data.returnedServices?.length > 0 && (
            <>
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
                    <td>{data.hairStraighteningDate ? new Date(data.hairStraighteningDate).toLocaleDateString() : 'غير معروف'}</td>
                  </tr>
                </tbody>
              </Table>
            </>
          )}
          {data.hairDye && (
            <>
              <h6>صبغة الشعر:</h6>
              <Table bordered size="sm">
                <tbody>
                  <tr key="hairDye">
                    <td>صبغة شعر</td>
                    <td>{data.hairDyePrice ? `${data.hairDyePrice} جنيه` : 'غير معروف'}</td>
                  </tr>
                  <tr key="hairDyeDate">
                    <td>تاريخ الصبغة</td>
                    <td>{data.hairDyeDate ? new Date(data.hairDyeDate).toLocaleDateString() : 'غير معروف'}</td>
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
          <p>تاريخ الخدمة: {data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'غير متوفر'}</p>
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
        </div>
      )}
    </div>
  );
};

export default ReceiptPrint;