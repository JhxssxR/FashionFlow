namespace FashionFlow.Models;

public class Employee
{
    public int EmpId { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public string EmpNumber { get; set; } = "";
    public string LastName { get; set; } = "";
    public string FirstName { get; set; } = "";
    public string MiddleName { get; set; } = "";
}
