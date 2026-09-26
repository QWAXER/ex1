#include <iostream>
#include <fstream>
#include <ctime>
#include <chrono>
#include <string>

using namespace std;

class book {
public:
    string Title;
    string Author;
    public:
    book(string title, string author) {
        Title = title;
        Author = author;
    }
};

int main()
{
    
    book* lb[5] = { new book("Меч Предназначения", "Анджей Сапковский"),
        new book("Бойцовский Клуб", "Чак Паланик"),
        new book("Драйв", "Николас Виндинг"),
        new book("Последнее желание", "Анджей Сапковский"),
        new book("Кровь эльфов", "Анджей Сапковский")
    };
    
    setlocale(LC_ALL, "Russian");
    ofstream file("Student_5.txt");
    char buffer[26];
    
    auto time = chrono::system_clock::now();
    time_t current_time = chrono::system_clock::to_time_t(time);

    string fileContent = "Филеня Кирилл Александрович\nГруппа 478\nВариант: 20\nДата: ";

    if (ctime_s(buffer, sizeof(buffer), &current_time) == 0) {
        file << fileContent << buffer << "\nЛюбимые книги:\n";
    }
    for (size_t i = 0; i < 5; i++) {
        file << "\"" << lb[i]->Title << "\"" << " - " << lb[i]->Author << endl;
    }
    //
    file.close();
    ifstream filereader("Student_5.txt");

    string line;
    size_t num = 0;

    ofstream filde("Student_5.txt", ios::app);

    while (getline(filereader, line)) {
        if (line.length() > 0) {
            num++;
        }
    }
    filde << "\nКол-во строк в файле: " << num;
    filde.close();
    filereader.close();

    string lineend;
    ifstream filereaderend("Student_5.txt");
    while (getline(filereaderend, lineend)) {
        cout << lineend << "\n";
    }
}