import { Building } from "lucide-react";

export default function SoonPanel() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-base font-semibold">
        <Building className="size-5 text-muted-foreground" />
        Бизнес-центр «Скоро»
      </div>
      <p className="text-lg">Здесь появится ваша компания</p>
      <p className="text-sm text-muted-foreground">
        Город рассчитан на много компаний: новая организация загружает свои профили и каталог обучения и получает
        собственные башни отделов рядом с остальными.
      </p>
    </div>
  );
}
