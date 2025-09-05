import React from 'react';
import QRCode from 'qrcode.react';
import { Table } from 'react-bootstrap';
import '../assets/css/receiptPrint.css';

const ReceiptPrint = ({ data, type }) => {
  if (!data || !type) {
    console.warn('ReceiptPrint: Missing data or type props');
    return null;
  }

  return (
    <div className="receipt-container">
      <div className="receipt-content">
        <img src="/logo.png" alt="Logo" className="receipt-logo" />
        <h5>Beauty Center</h5>

        {type === 'booking' ? (
          <>
            <p>اسم العميل: {data.clientName || 'غير متوفر'}</p>
            <p>رقم الوصل: {data.receiptNumber || 'غير متوفر'}</p>
            <p>
              تاريخ المناسبة:{' '}
              {data.eventDate
                ? new Date(data.eventDate).toLocaleDateString('ar-EG')
                : 'غير متوفر'}
            </p>
            {data.hennaDate && (
              <p>
                تاريخ الحنة:{' '}
                {new Date(data.hennaDate).toLocaleDateString('ar-EG')}
              </p>
            )}

            <h6>تفاصيل الباكدجات:</h6>
            <Table bordered>
              <thead>
                <tr>
                  <th>الباكدج</th>
                  <th>السعر</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  key={
                    data.package?._id
                      ? data.package._id.toString()
                      : 'package-main'
                  }
                >
                  <td>{data.package?.name || 'غير متوفر'}</td>
                  <td>
                    {data.package?.price
                      ? `${data.package.price} جنيه`
                      : 'غير متوفر'}
                  </td>
                </tr>

                {data.hennaPackage && (
                  <tr
                    key={
                      data.hennaPackage._id
                        ? data.hennaPackage._id.toString()
                        : 'henna-package'
                    }
                  >
                    <td>{data.hennaPackage.name || 'غير متوفر'}</td>
                    <td>
                      {data.hennaPackage.price
                        ? `${data.hennaPackage.price} جنيه`
                        : 'غير متوفر'}
                    </td>
                  </tr>
                )}

                {data.photographyPackage && (
                  <tr
                    key={
                      data.photographyPackage._id
                        ? data.photographyPackage._id.toString()
                        : 'photo-package'
                    }
                  >
                    <td>{data.photographyPackage.name || 'غير متوفر'}</td>
                    <td>
                      {data.photographyPackage.price
                        ? `${data.photographyPackage.price} جنيه`
                        : 'غير متوفر'}
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>

            {data.extraServices?.length > 0 && (
              <>
                <h6>الخدمات الإضافية:</h6>
                <Table bordered>
                  <thead>
                    <tr>
                      <th>الخدمة</th>
                      <th>السعر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.extraServices.map((srv, index) => (
                      <tr
                        key={
                          srv._id ? srv._id.toString() : `extra-service-${index}`
                        }
                      >
                        <td>{srv.name || 'غير معروف'}</td>
                        <td>
                          {srv.price ? `${srv.price} جنيه` : 'غير معروف'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </>
            )}

            {data.returnedServices?.length > 0 && (
              <>
                <h6>الخدمات المرتجعة:</h6>
                <Table bordered>
                  <thead>
                    <tr>
                      <th>الخدمة</th>
                      <th>السعر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.returnedServices.map((srv, index) => (
                      <tr
                        key={
                          srv._id
                            ? srv._id.toString()
                            : `returned-service-${index}`
                        }
                      >
                        <td>{srv.name || 'غير معروف'}</td>
                        <td>
                          {srv.price ? `-${srv.price} جنيه` : 'غير معروف'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </>
            )}

            {data.hairStraightening && (
              <>
                <h6>فرد الشعر:</h6>
                <Table bordered>
                  <tbody>
                    <tr key="hairStraightening">
                      <td>فرد شعر</td>
                      <td>
                        {data.hairStraighteningPrice
                          ? `${data.hairStraighteningPrice} جنيه`
                          : 'غير معروف'}
                      </td>
                    </tr>
                    <tr key="hairStraighteningDate">
                      <td>تاريخ فرد الشعر</td>
                      <td>
                        {data.hairStraighteningDate
                          ? new Date(
                              data.hairStraighteningDate
                            ).toLocaleDateString('ar-EG')
                          : 'غير معروف'}
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </>
            )}

            <p>
              <strong>
                الإجمالي:{' '}
                {data.total ? `${data.total} جنيه` : 'غير معروف'}
              </strong>
            </p>
            <p>
              <strong>
                العربون:{' '}
                {data.deposit ? `${data.deposit} جنيه` : 'غير معروف'}
              </strong>
            </p>
            <p>
              <strong>
                المتبقي:{' '}
                {data.remaining ? `${data.remaining} جنيه` : 'غير معروف'}
              </strong>
            </p>
          </>
        ) : (
          <>
            <p>رقم الوصل: {data.receiptNumber || 'غير متوفر'}</p>
            <p>
              تاريخ الخدمة:{' '}
              {data.createdAt
                ? new Date(data.createdAt).toLocaleDateString('ar-EG')
                : 'غير متوفر'}
            </p>
            <p>الموظف: {data.employeeId ? data.employeeId.username : 'غير محدد'}</p>

            <h6>الخدمات:</h6>
            <Table bordered>
              <thead>
                <tr>
                  <th>الخدمة</th>
                  <th>السعر</th>
                </tr>
              </thead>
              <tbody>
                {data.services?.length > 0 ? (
                  data.services.map((srv, index) => (
                    <tr
                      key={srv._id ? srv._id.toString() : `service-${index}`}
                    >
                      <td>{srv.name || 'غير معروف'}</td>
                      <td>
                        {srv.price ? `${srv.price} جنيه` : 'غير معروف'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2">غير محدد</td>
                  </tr>
                )}
              </tbody>
            </Table>

            <p>
              <strong>
                الإجمالي:{' '}
                {data.total ? `${data.total} جنيه` : 'غير معروف'}
              </strong>
            </p>
          </>
        )}

        {data.barcode && (
          <div className="qr-code">
            <QRCode value={data.barcode} size={120} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptPrint;
