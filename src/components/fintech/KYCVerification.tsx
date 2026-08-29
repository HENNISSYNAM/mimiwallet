import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Shield, Check, AlertTriangle, Loader2, Lock, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/useAuthStore';
import TechBadge from '@/components/ui/TechBadge';
import { toast } from 'sonner';

/**
 * Xác minh danh tính — bản chỉ còn những gì thật sự xảy ra.
 *
 * BẢN TRƯỚC CỦA FILE NÀY LÀ BỐN BƯỚC DIỄN, ba trong số đó không kiểm gì:
 *
 *   - "Nhận diện khuôn mặt" là một vòng tròn tiến độ cộng 2% mỗi 80ms. Không hề
 *     gọi `getUserMedia`, không mở camera, không chụp ảnh nào. Chạy hết vòng thì
 *     báo thành công.
 *   - "Xác minh liveness" là bốn dòng bấm được, mỗi dòng `setTimeout(800)` rồi
 *     tự đánh dấu xong. Nháy mắt, quay trái, quay phải, mỉm cười — không cái nào
 *     được quan sát.
 *   - "Xác minh OTP" có nút "Gửi mã" không gửi đi đâu, sáu ô nhận bất kỳ chữ số
 *     nào, và hàm phía máy chủ **không bao giờ đọc mã người dùng gõ**.
 *
 * Tệ nhất là dòng kết: `✓ Khuôn mặt khớp {kycRecord?.face_match_score || 98.7}%`
 * kèm "Vượt ngưỡng xác minh (95%)". Phiên trước đã sửa phía máy chủ trả `null`
 * cho điểm khớp — đúng, vì không đo gì — nhưng giao diện thì không sửa, nên
 * `null` rơi vào giá trị dự phòng và màn hình hiện **98,7%** cho người dùng
 * thật, kèm một ngưỡng 95% không tồn tại ở đâu cả.
 *
 * CÒN LẠI GÌ: tải ảnh CCCD. Việc đó có thật — tệp đi vào bucket riêng tư
 * `secure-documents` theo đường dẫn phân quyền `{company_id}/kyc/...`, và
 * `kyc-verify` ghi lại đường dẫn. Nên màn hình này giờ chỉ làm đúng chừng ấy,
 * rồi nói thẳng rằng hồ sơ đang **chờ người duyệt** — khớp với câu đã công bố
 * trong Chính sách bảo mật.
 *
 * Khi nào có nhà cung cấp eKYC thật, hoặc luồng đọc chip CCCD trong app native,
 * các bước đó quay lại — kèm phép đo thật.
 */

export default function KYCVerification({ onComplete }: { onComplete?: () => void }) {
  const { session } = useAuthStore();
  const [idFrontUploaded, setIdFrontUploaded] = useState(false);
  const [idBackUploaded, setIdBackUploaded] = useState(false);
  const [uploadingSide, setUploadingSide] = useState<'front' | 'back' | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [kycRecord, setKycRecord] = useState<{ status?: string } | null>(null);
  const fileInputRefs = {
    front: useRef<HTMLInputElement | null>(null),
    back: useRef<HTMLInputElement | null>(null),
  };

  const callKYC = async (action: string, body: Record<string, unknown> = {}) => {
    if (!session) {
      toast.error('Vui lòng đăng nhập');
      return null;
    }
    const { data, error } = await supabase.functions.invoke(`kyc-verify?action=${action}`, { body });
    if (error) {
      toast.error(error.message || 'Lỗi kết nối server');
      return null;
    }
    if (data?.error) {
      toast.error(data.error);
      return null;
    }
    return data?.data;
  };

  // Công ty của chính người gọi — cần để dựng đường dẫn lưu trữ có phân quyền.
  useEffect(() => {
    if (!session) return;
    const loadCompany = async () => {
      const { data: companies } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })
        .limit(1);
      if (companies && companies.length > 0) setCompanyId(companies[0].id);
    };
    void loadCompany();
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const loadKYC = async () => {
      const result = await callKYC('status');
      if (result) {
        setKycRecord(result);
        /*
         * Chỉ khôi phục hai cờ đọc được từ dữ liệu thật. Bản trước còn khôi phục
         * theo `face_match_score` và `liveness_passed`, mà cả hai nay vĩnh viễn
         * là `null`, nên nhánh đó không bao giờ chạy — một điều kiện chết.
         */
        if (result.id_front_url) setIdFrontUploaded(true);
        if (result.id_back_url) setIdBackUploaded(true);
      }
    };
    void loadKYC();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleFileUpload = async (side: 'front' | 'back', file: File) => {
    if (!session || !companyId) {
      toast.error('Không xác định được doanh nghiệp của bạn');
      return;
    }

    setUploadingSide(side);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const storagePath = `${companyId}/kyc/${side}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('secure-documents')
        .upload(storagePath, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        toast.error(`Tải ảnh thất bại: ${uploadError.message}`);
        return;
      }

      if (!kycRecord) {
        const record = await callKYC('start');
        if (record) setKycRecord(record);
      }

      const updated = await callKYC('upload-id', { side, storagePath });
      if (!updated) return;

      if (side === 'front') setIdFrontUploaded(true);
      else setIdBackUploaded(true);
      toast.success(`Đã nhận ảnh ${side === 'front' ? 'mặt trước' : 'mặt sau'}`);

      if ((side === 'front' ? true : idFrontUploaded) && (side === 'back' ? true : idBackUploaded)) {
        onComplete?.();
      }
    } finally {
      setUploadingSide(null);
    }
  };

  const onFileInputChange = (side: 'front' | 'back') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void handleFileUpload(side, file);
  };

  const duCaHaiMat = idFrontUploaded && idBackUploaded;

  const OTai = ({ side, daCo }: { side: 'front' | 'back'; daCo: boolean }) => (
    <div>
      <input
        ref={fileInputRefs[side]}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileInputChange(side)}
      />
      <button
        onClick={() => fileInputRefs[side].current?.click()}
        disabled={uploadingSide !== null}
        className={`w-full aspect-[1.6] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${
          daCo
            ? 'border-mimi-green/40 bg-mimi-green/5'
            : 'border-border hover:border-primary/40 bg-card'
        } disabled:opacity-50`}
      >
        {uploadingSide === side ? (
          <Loader2 size={22} className="animate-spin text-primary" />
        ) : daCo ? (
          <Check size={22} className="text-mimi-green" />
        ) : (
          <Upload size={22} className="text-muted-foreground" />
        )}
        <span className="text-xs text-muted-foreground">
          {side === 'front' ? 'Mặt trước' : 'Mặt sau'}
          {daCo && ' — đã nhận'}
        </span>
      </button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h3 className="font-display font-bold text-foreground text-lg flex items-center gap-2">
            <Shield size={18} className="text-primary" /> Gửi hồ sơ xác minh
          </h3>
          <TechBadge icon={Lock} label="Mã hóa kháng lượng tử ML-KEM-768" tone="blue" />
        </div>
        <p className="text-sm text-muted-foreground">
          Tải ảnh hai mặt CCCD. Ảnh được lưu trong kho riêng tư, chỉ doanh nghiệp bạn
          truy cập được.
        </p>
      </div>

      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle size={16} className="text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm text-foreground font-medium">Hướng dẫn chụp</p>
          <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
            <li>• Đặt thẻ trên nền sáng, không bị che khuất</li>
            <li>• Đủ ánh sáng, không bị loá</li>
            <li>• Chụp rõ bốn góc của thẻ</li>
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <OTai side="front" daCo={idFrontUploaded} />
        <OTai side="back" daCo={idBackUploaded} />
      </div>

      {/*
        Trạng thái thật, không phải dấu tick cho vui.
        MIMI hiện chưa tích hợp nhà cung cấp eKYC nào, nên không có phép đo tự
        động nào chạy trên ảnh này. Nói đúng như vậy.
      */}
      {duCaHaiMat && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-mimi-amber/30 bg-mimi-amber/5 p-4 flex items-start gap-3"
        >
          <Clock size={16} className="text-mimi-amber mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Đã nhận đủ hồ sơ — chờ duyệt</p>
            <p className="text-muted-foreground mt-1 leading-relaxed">
              Ảnh của bạn đã được lưu an toàn. Hiện chưa có bước đối chiếu tự động nào
              chạy trên hồ sơ này, nên <strong className="text-foreground">danh tính chưa
              được xác minh</strong> — hồ sơ đang chờ người duyệt. Chúng tôi sẽ báo bạn
              khi có kết quả.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
