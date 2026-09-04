using FashionFlow.Data;
using FashionFlow.Models;
using FashionFlow.Services;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FashionFlow.Controllers;

[ApiController]
[Route("api/suppliers")]
[Authorize(Roles = "Admin,PurchasingOfficer,Accountant")]
public class SuppliersController(FashionFlowDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List()
    {
        var rows = await db.Suppliers.OrderBy(s => s.Name)
            .Select(s => new
            {
                id = s.SupplierId,
                s.Name,
                s.Contact,
                s.Email,
                s.Category,
                s.Address,
                s.Rating,
                onTime = s.OnTimeRate
            })
            .ToListAsync();
        return Ok(rows);
    }

    public record SaveSupplierRequest(
        [Required] string Name, [Required] string Contact, [Required, EmailAddress] string Email,
        [Required] string Category, [Required] string Address);

    [HttpPost]
    [Authorize(Roles = "Admin,PurchasingOfficer")]
    public async Task<IActionResult> Create(SaveSupplierRequest req)
    {
        var supplier = new Supplier
        {
            Name = req.Name.Trim(),
            Contact = req.Contact.Trim(),
            Email = req.Email.Trim().ToLowerInvariant(),
            Category = req.Category,
            Address = req.Address,
            Rating = 0,
            OnTimeRate = 0
        };
        db.Suppliers.Add(supplier);
        db.SystemLogs.Add(Audit.Log(User.Email(), $"Supplier onboarded: {supplier.Name}", "Purchasing"));
        await db.SaveChangesAsync();
        return StatusCode(201, new { id = supplier.SupplierId, supplier.Name });
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Admin,PurchasingOfficer")]
    public async Task<IActionResult> Update(int id, SaveSupplierRequest req)
    {
        var supplier = await db.Suppliers.FindAsync(id);
        if (supplier is null) return NotFound(new { message = "Supplier not found." });

        supplier.Name = req.Name.Trim();
        supplier.Contact = req.Contact.Trim();
        supplier.Email = req.Email.Trim().ToLowerInvariant();
        supplier.Category = req.Category;
        supplier.Address = req.Address;
        db.SystemLogs.Add(Audit.Log(User.Email(), $"Supplier updated: {supplier.Name}", "Purchasing"));
        await db.SaveChangesAsync();
        return Ok(new { ok = true });
    }
}
