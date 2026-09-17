const m = {
  fin: {
    invoices: {
      title: 'Hóa đơn',
      activeCount: '{{count}} hóa đơn đang hoạt động',
      createInvoice: 'Tạo hóa đơn',
      stats: {
        total: 'Tổng hóa đơn',
        pending: 'Chưa thanh toán',
        overdue: 'Quá hạn',
        paid: 'Đã thu',
        advanced: 'Đã ứng vốn',
      },
      searchPlaceholder: 'Tìm theo khách hàng, số HĐ...',
      filters: {
        all: 'Tất cả',
        pending: 'Chưa TT',
        overdue: 'Quá hạn',
        paid: 'Đã TT',
        advanced: 'Đã ứng',
      },
      status: {
        pending: 'Chưa TT',
        overdue: 'Quá hạn',
        paid: 'Đã TT',
        advanced: 'Đã ứng vốn',
      },
      table: {
        number: 'Số HĐ',
        client: 'Khách hàng',
        issued: 'Ngày phát',
        due: 'Đến hạn',
        amount: 'Số tiền',
        status: 'Trạng thái',
      },
      advanceAction: 'Ứng vốn',
      emptyTitle: 'Chưa có hóa đơn nào',
      emptyDesc: 'Bấm "Tạo hóa đơn" để thêm hóa đơn đầu tiên.',
      modal: {
        title: 'Tạo hóa đơn mới',
        client: 'Khách hàng',
        clientPlaceholder: 'VD: Công ty ABC',
        amountBeforeTax: 'Số tiền trước thuế',
        amountPlaceholder: 'VD: 50000000',
        vat: 'VAT (%)',
        dueDate: 'Ngày đến hạn',
        submit: 'Tạo hóa đơn',
      },
      detail: {
        client: 'Khách hàng',
        amountBeforeTax: 'Số tiền trước thuế',
        vat: 'VAT ({{rate}}%)',
        total: 'Tổng cộng',
        issuedDate: 'Ngày phát hành',
        dueDate: 'Ngày đến hạn',
        advanceTitle: 'Ứng vốn hóa đơn — chưa khả dụng',
        advanceAmount: 'Ước tính có thể ứng (80%)',
        advanceFee: 'Phí tham khảo (1.5% / 30 ngày)',
        advanceNow: 'Ứng vốn ngay →',
        advanceUnavailable:
          'MIMI chưa cấp vốn. Hai con số trên là ước tính để bạn hình dung, không phải khoản đã được duyệt — bấm cũng chưa có tiền về tài khoản.',
      },
      toast: {
        fillRequired: 'Vui lòng nhập đầy đủ khách hàng, số tiền và ngày đến hạn',
        companyNotFound: 'Không tìm thấy doanh nghiệp của bạn',
        createFailed: 'Tạo hóa đơn thất bại: {{error}}',
        createSuccess: 'Đã tạo hóa đơn {{number}}',
        advanceFailed: 'Ứng vốn thất bại: {{error}}',
        advanceSuccess: 'Đã ứng vốn {{amount}} cho hóa đơn {{number}}',
      },
    },
    loans: {
      loanTypes: {
        workingCapital: 'Vốn lưu động',
        invoiceAdvance: 'Ứng hóa đơn',
        expansion: 'Mở rộng KD',
      },
      creditScore: {
        rank: 'Hạng A — Xuất sắc',
        updated: 'Cập nhật: 09/03/2026',
        higherThan: 'Cao hơn 84% doanh nghiệp cùng ngành',
        analysisTitle: 'Phân tích điểm tín dụng',
        factors: {
          paymentHistory: 'Lịch sử thanh toán',
          cashFlowHealth: 'Sức khỏe dòng tiền',
          capitalUsageRatio: 'Tỷ lệ sử dụng vốn',
          operatingTime: 'Thời gian hoạt động',
        },
        boostCta: '3 cách để tăng điểm ngay',
      },
      calculator: {
        title: 'Tính toán khoản vay',
        loanAmount: 'Số tiền vay',
        term: 'Thời hạn',
        termUnit: 'N',
        receivedAmount: 'Số tiền nhận được',
        fee: 'Phí',
        feeRate: '(2%/kỳ)',
        dueDate: 'Ngày đến hạn',
        effectiveRate: 'Lãi suất hiệu dụng',
        perYear: '%/năm',
        applyNow: 'Đăng ký vay ngay →',
      },
      activeLoans: {
        title: 'Khoản vay đang hoạt động ({{count}})',
        emptyTitle: 'Chưa có khoản vay nào',
        emptyDesc: 'Dùng công cụ tính toán ở trên để đăng ký khoản vay đầu tiên.',
        table: {
          type: 'Loại',
          amount: 'Số tiền',
          appliedDate: 'Ngày đăng ký',
          dueDate: 'Đến hạn',
          repaymentProgress: 'Tiến độ trả nợ',
          status: 'Trạng thái',
        },
      },
      status: {
        on_track: 'Đúng hạn',
        completed: 'Hoàn thành',
        due_soon: 'Sắp đến hạn',
        pending: 'Chờ duyệt',
      },
      toast: {
        companyNotFound: 'Không tìm thấy doanh nghiệp của bạn',
        applyFailed: 'Đăng ký vay thất bại: {{error}}',
        // Was 'Đã gửi yêu cầu vay, đang chờ duyệt' — nothing is awaiting
        // approval, because there is no lender to approve it. This records
        // interest, which is honest and is also the demand signal MIMI needs in
        // order to go and find a lending partner at all.
        applySuccess: 'Đã ghi nhận nhu cầu vay của bạn. MIMI chưa có đối tác cho vay — chúng tôi sẽ báo bạn khi có.',
      },
    },
    reports: {
      title: 'Tổng hợp dòng tiền ngân hàng',
      subtitle: 'Tiền vào, tiền ra từ sao kê — chưa phải báo cáo tài chính',
      export: 'Xuất CSV',
      revenueExpense: {
        title: 'Tiền vào và tiền ra theo tháng',
        revenue: 'Tiền vào',
        expense: 'Tiền ra',
        profit: 'Chênh lệch',
      },
      invoiceAging: {
        title: 'Phân tích tuổi hóa đơn',
      },
      expenseBreakdown: {
        title: 'Tiền ra theo nhóm',
      },
    },
  },
};
export default m;
