import "@typespec/http";

using TypeSpec.Http;

namespace AlfaHackathonApi.Facts;

@doc("Документы о компании в multipart/form-data. Каждый файл передаётся отдельной частью files.")
model UploadDocumentsRequest {
    @doc("От 1 до 5 файлов PDF, DOCX или TXT, до 10 МБ каждый. Имя файла становится подписью источника.")
    files: HttpPart<File>[];
}
