# Загрузчик страниц

«Загрузчик страниц» — утилита командной строки, которая скачивает страницы из интернета и сохраняет их на компьютере. Вместе со страницей она скачивает все ресурсы (картинки, стили и js) давая возможность открывать страницу без интернета.

[![Actions Status](https://github.com/viktor-dorokhov/js-async-project-4/actions/workflows/code-check.yml/badge.svg)](https://github.com/viktor-dorokhov/js-async-project-4/actions)
[![Actions Status](https://github.com/viktor-dorokhov/js-async-project-4/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/viktor-dorokhov/js-async-project-4/actions)
[![Maintainability](https://api.codeclimate.com/v1/badges/a25b737b93fb3b023886/maintainability)](https://codeclimate.com/github/viktor-dorokhov/js-async-project-4/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/a25b737b93fb3b023886/test_coverage)](https://codeclimate.com/github/viktor-dorokhov/js-async-project-4/test_coverage)


## Установка

Для установки выполните следующие команды:
```
git clone git@github.com:viktor-dorokhov/js-async-project-4.git page-loader
cd page-loader
make install
npm link
```

### Использование
```
page-loader [опции] аргументы
```

### Аргументы:
```
<url> - полный URL страницы, которую нужно скачать
```

### Опции:
```
-V, --version        вывод версии программы
-o, --output <path>  директория, куда скачиваются страницы (по умолчанию, текущая директория)
-h, --help           вывод справки по программе
```

## Примеры:

### Скачивание в текущую директорию:
```
page-loader https://ru.hexlet.io/courses
```

### Скачивание в определенную директорию
```
page-loader https://ru.hexlet.io/courses -o /var/tmp
```

## Демо:

[![asciicast](https://asciinema.org/a/656703.svg)](https://asciinema.org/a/656703)
